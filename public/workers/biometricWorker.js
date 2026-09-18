/**
 * Biometric Dedicated Web Worker
 * Ejecuta cálculos de distancia vectorial 128D, centroides y selección de diversidad
 * fuera del hilo principal de React para mantener la cámara a 60 FPS sin tirones.
 */

self.onmessage = function (e) {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'EUCLIDEAN_DISTANCE': {
        const { vecA, vecB } = payload;
        const dist = calcEuclideanDistance(vecA, vecB);
        self.postMessage({ id, type, result: dist });
        break;
      }

      case 'COMPUTE_CENTROID': {
        const { vectors } = payload;
        const centroid = calcCentroid(vectors);
        self.postMessage({ id, type, result: centroid });
        break;
      }

      case 'SELECT_MOST_DIVERSE': {
        const { pool, k } = payload;
        const selected = selectMostDiverse(pool, k);
        self.postMessage({ id, type, result: selected });
        break;
      }

      case 'MATCH_FACE': {
        const { liveVector, knownEmployees, umbralDistancia, margenAmbiguedad } = payload;
        const match = findBestMatch(liveVector, knownEmployees, umbralDistancia, margenAmbiguedad);
        self.postMessage({ id, type, result: match });
        break;
      }

      default:
        self.postMessage({ id, type, error: `Tipo de evento ${type} no soportado` });
    }
  } catch (err) {
    self.postMessage({ id, type, error: err.message });
  }
};

function calcEuclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function calcCentroid(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += v[i] / vectors.length;
    }
  }
  return avg;
}

function selectMostDiverse(pool, k) {
  if (pool.length <= k) return pool;
  const sorted = [...pool].sort((a, b) => b.quality - a.quality);
  const selected = [sorted[0]];
  const remaining = sorted.slice(1);

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestMinDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i].descriptor;
      let minDist = Infinity;
      for (const s of selected) {
        let dist = calcEuclideanDistance(candidate, s.descriptor);
        if (dist < minDist) minDist = dist;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }
    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  return selected;
}

function findBestMatch(live, knownEmployees, umbralDistancia, margenAmbiguedad) {
  if (!live || !knownEmployees || knownEmployees.length === 0) return null;

  const candidates = [];

  for (const emp of knownEmployees) {
    const storedVectors = emp.vectors;
    if (!storedVectors || storedVectors.length === 0) continue;

    let minDist = Infinity;
    let sumDist = 0;

    for (const vec of storedVectors) {
      const d = calcEuclideanDistance(live, vec);
      if (d < minDist) minDist = d;
      sumDist += d;
    }

    if (storedVectors.length === 1) {
      candidates.push({ id: emp.id, distance: minDist });
    } else {
      const centroid = calcCentroid(storedVectors);
      const centroidDist = calcEuclideanDistance(live, centroid);
      // Ponderación: 60% centroide + 40% muestra individual más cercana
      const effectiveDist = 0.6 * centroidDist + 0.4 * minDist;
      candidates.push({ id: emp.id, distance: effectiveDist });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.distance - b.distance);

  const best = candidates[0];
  const second = candidates[1];

  if (best.distance >= umbralDistancia) return null;

  if (second && (second.distance - best.distance) < margenAmbiguedad) {
    return null; // Rechazado por ambigüedad
  }

  const confidence = Math.round((1 - best.distance / umbralDistancia) * 100);
  return { id: best.id, distance: best.distance, confidence };
}
