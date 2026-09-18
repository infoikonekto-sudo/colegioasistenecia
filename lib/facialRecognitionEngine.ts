import * as faceapi from 'face-api.js';
import { initTensorFlowGPU } from './tfBackend';
import { matchFaceAsync } from './biometricWorkerClient';

const MODEL_URL = '/models';

// ─── Configuración biométrica ─────────────────────────────────────────────────
export const BIOMETRIC_CONFIG = {
    deteccion: {
        scoreThreshold: 0.75,    // Subido a 0.75 para alta precisión de detección
        inputSize: 512,
    },
    registro: {
        muestrasRequeridas: 8,   // 8 muestras durante el registro
        intervaloMs: 300,
        timeoutMs: 45000,
    },
    calidad: {
        areaMinima: 0.12,        // Subido a 0.12 para descartar capturas lejanas o borrosas
        areaMaxima: 0.80,
        centradoMargen: 0.30,
        earThreshold: 0.20,      // Eye Aspect Ratio en 0.20 para ojos bien abiertos y alineados
    },
    reconocimiento: {
        umbralDistancia: 0.42,   // Ajustado a 0.42 según evidencia empírica en consola (reconoce 0.38-0.408 y rechaza 0.58-0.66)
        margenAmbiguedad: 0.10,
        muestrasGuardar: 5,
    },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Nuevo formato: array de descriptores (multi-vector)
// Formato antiguo: un solo descriptor (backward-compatible)
export type DescriptorEntry = {
    id: string;
    descriptor: number[] | Float32Array | number[][] | Float32Array[];
};

export type RecognizeResult = {
    id: string;
    distance: number;
    confidence: number; // 0-100
} | null;

// ─── Engine ───────────────────────────────────────────────────────────────────
export class FacialRecognitionEngine {
    private modelsLoaded = false;

    async loadModels(): Promise<void> {
        if (this.modelsLoaded) return;
        await initTensorFlowGPU();
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        this.modelsLoaded = true;
        console.log('[Biometría] Modelos cargados correctamente con aceleración GPU WebGL');
    }

    async detectSingleFace(video: HTMLVideoElement) {
        const options = new faceapi.SsdMobilenetv1Options({
            minConfidence: BIOMETRIC_CONFIG.deteccion.scoreThreshold,
        });
        return await faceapi
            .detectSingleFace(video, options)
            .withFaceLandmarks()
            .withFaceDescriptor();
    }

    // ── Normaliza cualquier formato de descriptor a Float32Array ─────────────
    private toFloat32(d: number[] | Float32Array): Float32Array {
        return d instanceof Float32Array ? d : new Float32Array(d);
    }

    // ── Extrae todos los descriptores de una entrada (1 o N vectores) ────────
    private extractDescriptors(entry: DescriptorEntry): Float32Array[] {
        const raw = entry.descriptor;
        if (!raw) return [];

        // Formato antiguo: number[] o Float32Array (un solo vector de 128 valores)
        if (raw instanceof Float32Array) {
            return [raw];
        }

        if (Array.isArray(raw)) {
            // ¿Es un array de números (formato antiguo)?
            if (typeof raw[0] === 'number') {
                return [new Float32Array(raw as number[])];
            }
            // ¿Es un array de arrays (formato nuevo)?
            if (Array.isArray(raw[0]) || raw[0] instanceof Float32Array) {
                return (raw as (number[] | Float32Array)[]).map(d => this.toFloat32(d));
            }
        }

        return [];
    }

    // ── Distancia evaluada considerando centroide y muestras multi-vector ────
    private bestDistanceTo(live: Float32Array, stored: Float32Array[]): number {
        if (!stored || stored.length === 0) return Infinity;
        
        const distances = stored.map(s => faceapi.euclideanDistance(live, s)).sort((a, b) => a - b);
        const minDist = distances[0];
        
        if (stored.length === 1) return minDist;

        // Para multi-vector (3 a 5 muestras), calcular la distancia contra el centroide
        const centroid = FacialRecognitionEngine.promediar(stored);
        const centroidDist = faceapi.euclideanDistance(live, centroid);

        // Promedio ponderado: 60% centroide + 40% mejor muestra individual
        return 0.6 * centroidDist + 0.4 * minDist;
    }

    /**
     * recognize() — BACKWARD COMPATIBLE
     * Mantiene la misma firma para no romper CamaraReconocimiento.tsx.
     * Internamente usa el algoritmo mejorado con multi-descriptores.
     */
    async recognize(
        video: HTMLVideoElement,
        knownDescriptors: Array<{ id: string; descriptor: number[] | Float32Array }>
    ): Promise<{ id: string; distance: number } | null> {
        const result = await this.recognizeMulti(video, knownDescriptors);
        return result;
    }

    /**
     * recognizeMulti() — ALGORITMO MEJORADO
     *
     * Mejoras sobre el algoritmo anterior:
     * 1. Soporta múltiples descriptores por empleado (multi-vector enrollment)
     * 2. Umbral más estricto: 0.42 (era 0.50)
     * 3. Margen de ambigüedad: rechaza si 2°mejor candidato está muy cerca
     * 4. Retorna confianza como porcentaje (0-100)
     */
    async recognizeMulti(
        video: HTMLVideoElement,
        knownDescriptors: DescriptorEntry[]
    ): Promise<RecognizeResult> {
        if (!video || video.readyState !== 4 || video.videoWidth === 0) return null;
        if (!knownDescriptors || knownDescriptors.length === 0) return null;

        const detection = await this.detectSingleFace(video);
        if (!detection) return null;

        const live = detection.descriptor;

        // Pre-parsear descriptores conocidos a arrays contiguos para el Worker
        const formattedEmployees = knownDescriptors.map(entry => ({
            id: entry.id,
            vectors: this.extractDescriptors(entry).map(vec => Array.from(vec))
        })).filter(e => e.vectors.length > 0);

        // Búsqueda biométrica asíncrona off-thread en Web Worker
        const result = await matchFaceAsync(
            live,
            formattedEmployees,
            BIOMETRIC_CONFIG.reconocimiento.umbralDistancia,
            BIOMETRIC_CONFIG.reconocimiento.margenAmbiguedad
        );

        if (!result) return null;

        console.log(`[Biometría WebWorker] ✅ ID=${result.id} distancia=${result.distance.toFixed(3)} confianza=${result.confidence}%`);
        return result;
    }

    /**
     * promediarDescriptores() — para comparaciones en anti-duplicado
     * Toma N muestras y devuelve su promedio (para la API de enrolamiento)
     */
    static promediar(samples: Float32Array[]): Float32Array {
        const avg = new Float32Array(128).fill(0);
        for (const s of samples) {
            for (let i = 0; i < 128; i++) avg[i] += s[i] / samples.length;
        }
        return avg;
    }

    /**
     * evalAutoAprendizaje()
     * Evalúa si un nuevo vector facial capturado en vivo aporta información útil
     * (un nuevo ángulo, diferente iluminación o expresión) para enriquecer el perfil biométrico.
     */
    evalAutoAprendizaje(
        liveDescriptor: Float32Array | number[],
        existingDescriptors: (number[] | Float32Array)[]
    ): { debeGuardar: boolean; nuevosDescriptores: number[][] } {
        if (!liveDescriptor) return { debeGuardar: false, nuevosDescriptores: [] };

        const live = liveDescriptor instanceof Float32Array ? liveDescriptor : new Float32Array(liveDescriptor);
        const stored = (existingDescriptors || []).map(d => d instanceof Float32Array ? d : new Float32Array(d));

        if (stored.length === 0) {
            return { debeGuardar: true, nuevosDescriptores: [Array.from(live)] };
        }

        // Calcular distancia a las muestras existentes
        const distances = stored.map(s => faceapi.euclideanDistance(live, s)).sort((a, b) => a - b);
        const minDist = distances[0];

        // Si la distancia está entre 0.14 y 0.38, la IA aprende este nuevo ángulo/luz sin confundir identidades
        if (minDist >= 0.14 && minDist <= 0.38) {
            const rawStored = stored.map(s => Array.from(s));
            if (rawStored.length < 8) {
                rawStored.push(Array.from(live));
            } else {
                rawStored[rawStored.length - 1] = Array.from(live);
            }
            console.log(`[IA Auto-Aprendizaje] 🤖 Muestra biométrica aprendida automáticamente (Total vectores: ${rawStored.length})`);
            return { debeGuardar: true, nuevosDescriptores: rawStored };
        }

        return { debeGuardar: false, nuevosDescriptores: [] };
    }

    /**
     * calcularVarianza() — mide qué tan dispersas están las muestras
     * Útil para detectar si el empleado se movió demasiado durante el enrolamiento
     */
    static calcularVarianza(samples: Float32Array[]): number {
        if (samples.length < 2) return 0;
        const avg = FacialRecognitionEngine.promediar(samples);
        let variance = 0;
        for (const s of samples) {
            const d = faceapi.euclideanDistance(s, avg);
            variance += d * d;
        }
        return variance / samples.length;
    }
}

export const facialEngine = new FacialRecognitionEngine();
