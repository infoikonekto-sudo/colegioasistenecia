/**
 * Client Helper para comunicarse con biometricWorker.js en segundo plano
 * Proporciona fallback transparente en línea si los Web Workers están desactivados.
 */

let worker: Worker | null = null;
let messageId = 0;
const pendingCallbacks = new Map<number, (res: { result?: any; error?: string }) => void>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (!worker && typeof Worker !== 'undefined') {
    try {
      worker = new Worker('/workers/biometricWorker.js');
      worker.onmessage = function (e) {
        const { id, result, error } = e.data;
        const callback = pendingCallbacks.get(id);
        if (callback) {
          pendingCallbacks.delete(id);
          callback({ result, error });
        }
      };
      worker.onerror = function (err) {
        console.warn('[Biometric Worker] Error en Worker, usando fallback inline:', err);
      };
    } catch (e) {
      console.warn('[Biometric Worker] No se pudo inicializar Worker, usando fallback inline');
      worker = null;
    }
  }
  return worker;
}

export function matchFaceAsync(
  liveVector: number[] | Float32Array,
  knownEmployees: Array<{ id: string; vectors: number[][] }>,
  umbralDistancia: number,
  margenAmbiguedad: number
): Promise<{ id: string; distance: number; confidence: number } | null> {
  const live = Array.from(liveVector);
  const w = getWorker();

  if (w) {
    return new Promise((resolve) => {
      const id = ++messageId;

      // Safety timeout: si el Web Worker no responde en 3000ms, resolver null y limpiar
      const timeoutId = setTimeout(() => {
        if (pendingCallbacks.has(id)) {
          pendingCallbacks.delete(id);
          resolve(findBestMatchInline(live, knownEmployees, umbralDistancia, margenAmbiguedad));
        }
      }, 3000);

      pendingCallbacks.set(id, (res) => {
        clearTimeout(timeoutId);
        if (res.error) resolve(null);
        else resolve(res.result || null);
      });

      try {
        w.postMessage({
          id,
          type: 'MATCH_FACE',
          payload: {
            liveVector: live,
            knownEmployees,
            umbralDistancia,
            margenAmbiguedad
          }
        });
      } catch (err) {
        clearTimeout(timeoutId);
        pendingCallbacks.delete(id);
        resolve(findBestMatchInline(live, knownEmployees, umbralDistancia, margenAmbiguedad));
      }
    });
  }

  // Fallback inline si no hay Web Worker
  return Promise.resolve(findBestMatchInline(live, knownEmployees, umbralDistancia, margenAmbiguedad));
}

function findBestMatchInline(live: number[], knownEmployees: any[], umbralDistancia: number, margenAmbiguedad: number) {
  if (!live || !knownEmployees || knownEmployees.length === 0) return null;
  const candidates: { id: string; distance: number }[] = [];

  for (const emp of knownEmployees) {
    const vectors = emp.vectors;
    if (!vectors || vectors.length === 0) continue;
    let minDist = Infinity;
    for (const vec of vectors) {
      let sum = 0;
      for (let i = 0; i < live.length; i++) {
        const diff = live[i] - vec[i];
        sum += diff * diff;
      }
      const d = Math.sqrt(sum);
      if (d < minDist) minDist = d;
    }
    candidates.push({ id: emp.id, distance: minDist });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);

  const best = candidates[0];
  const second = candidates[1];

  if (best.distance >= umbralDistancia) return null;
  if (second && (second.distance - best.distance) < margenAmbiguedad) return null;

  const confidence = Math.round((1 - best.distance / umbralDistancia) * 100);
  return { id: best.id, distance: best.distance, confidence };
}
