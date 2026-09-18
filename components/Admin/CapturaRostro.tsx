'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const MODEL_URL = '/models';
const MIN_CONFIDENCE = 0.70;
const DETECTION_INTERVAL_MS = 80;  // Detección ultra-rápida
const CENTRADO_MARGEN = 0.35;
const AREA_MINIMA = 0.08;

// Cache global de modelos para evitar fugas de memoria al enrolar personas consecutivas
let modelsLoadedGlobal = false;

// Ultra-fast enrolment: captura 5 muestras rápidas y guarda las 3 mejores
const MAX_POOL = 5;           // Captura sólo 5 muestras (procesamiento en <1.5s)
const BEST_N = 3;             // Guarda las 3 mejores
const MIN_QUALITY_SCORE = 50; // Acepta capturas de calidad estándar

// ─── Asistente de voz (Web Speech API) ───────────────────────────────────────
function speak(text: string) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'es-ES';
  msg.rate = 0.92;
  msg.pitch = 1.05;
  msg.volume = 1.0;
  try { synth.speak(msg); } catch (_) { }
}

// ─── Efectos de Sonido Armónicos y Agradables (Web Audio API) ─────────────────
// Sonido suave de cada toma en la secuencia (Pulso armónico estilo marimba)
function playCaptureBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;
    
    // Tono suave primario (Re5 / 587.33Hz)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.09); // Suave elevación a Sol5
    
    gain.gain.setValueAtTime(0.06, now); // Volumen suave no molesto
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (_) { }
}

// Sonido de inicio al abrir la cámara (Doble nota dulce C5 -> E5)
function playStartChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;
    
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + idx * 0.1;
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  } catch (_) { }
}

// Sonido elegante de éxito al completar enrolamiento (Acorde Armónico E5 -> G#5 -> B5 -> E6)
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;
    
    // Acorde Mi Mayor brillante (Agradable tipo Apple / Face ID)
    const notas = [659.25, 830.61, 987.77, 1318.51];
    notas.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (_) { }
}

// ─── Análisis de calidad de un frame ─────────────────────────────────────────
function analyzeLighting(video: HTMLVideoElement): { score: number; msg: string } {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { score: 100, msg: '' };
    ctx.drawImage(video, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    let brightness = 0;
    for (let i = 0; i < d.length; i += 4) {
      brightness += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    }
    brightness /= (d.length / 4);
    if (brightness < 60) return { score: 30, msg: 'Hay poca luz. Busca un lugar más iluminado o enciende una luz frente a ti.' };
    if (brightness > 220) return { score: 40, msg: 'Hay demasiada luz. Evita que la luz te dé de frente directamente.' };
    if (brightness < 90) return { score: 70, msg: 'La iluminación podría mejorar un poco. Acércate a una fuente de luz.' };
    return { score: 100, msg: '' };
  } catch (_) {
    return { score: 100, msg: '' };
  }
}

// ─── Diversidad entre descriptores (mayor = más diversos) ────────────────────
// Selecciona el subconjunto de `k` descriptores con máxima distancia entre sí
function selectMostDiverse(pool: SampleData[], k: number): SampleData[] {
  if (pool.length <= k) return pool;

  // Ordenar por calidad desc, tomar los mejores como candidatos
  const sorted = [...pool].sort((a, b) => b.quality - a.quality);

  // Greedy max-diversity selection: empieza con el de mejor calidad y va agregando
  // el que mayor distancia mínima tenga respecto a los ya seleccionados
  const selected: SampleData[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestMinDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i].descriptor;
      let minDist = Infinity;
      for (const s of selected) {
        let dist = 0;
        for (let j = 0; j < 128; j++) {
          dist += (candidate[j] - s.descriptor[j]) ** 2;
        }
        dist = Math.sqrt(dist);
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

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SampleData {
  descriptor: Float32Array;
  quality: number;        // 0-100
  qualityDetail: string;  // Detalle del score
}

interface CapturaRostroProps {
  empleadoId: string;
  onSuccess?: (descriptor: number[]) => void;
  onCancel?: () => void;
}

type Estado =
  | 'cargando_modelos' | 'iniciando_camara' | 'listo'
  | 'capturando' | 'analizando' | 'verificando'
  | 'duplicado' | 'completado' | 'error';

interface EmpleadoDuplicado {
  id: string; nombre: string; apellido: string;
  cedula: string; departamento: string; similitud: number;
}

// ─── Tipos del asistente ──────────────────────────────────────────────────────
interface AssistantState {
  msg: string;
  tip?: string;
  type: 'idle' | 'guide' | 'warn' | 'success' | 'error';
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CapturaRostro({ empleadoId, onSuccess, onCancel }: CapturaRostroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRunningRef = useRef(false);
  const poolRef = useRef<SampleData[]>([]);
  const processingRef = useRef(false);
  const isDetectingRef = useRef(false);
  const lastSpeechRef = useRef('');
  const lastSpeechTimeRef = useRef(0);
  const lightingCheckRef = useRef(0);
  const ssdOptionsRef = useRef<faceapi.SsdMobilenetv1Options | null>(null);

  if (!ssdOptionsRef.current && typeof window !== 'undefined') {
    ssdOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE });
  }

  const [estado, setEstado] = useState<Estado>('cargando_modelos');
  const [progreso, setProgreso] = useState(0);         // muestras en pool
  const [feedback, setFeedback] = useState('INICIANDO...');
  const [error, setError] = useState<string | null>(null);
  const [empleadoDuplicado, setEmpleadoDuplicado] = useState<EmpleadoDuplicado | null>(null);
  const [totalComparaciones, setTotalComparaciones] = useState(0);
  const [quality, setQuality] = useState({ detec: false, pos: false, eyes: false });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [assistant, setAssistant] = useState<AssistantState>({
    msg: 'Hola, soy tu asistente de enrolamiento biométrico. Te guiaré paso a paso para garantizar un registro de alta calidad.',
    type: 'idle',
  });
  const [qualityScore, setQualityScore] = useState(0);
  const [acceptedSamples, setAcceptedSamples] = useState(0);
  const [rejectedSamples, setRejectedSamples] = useState(0);
  const [lightWarn, setLightWarn] = useState('');

  // ── Asistente reactivo ────────────────────────────────────────────────────
  const guide = useCallback((msg: string, tip?: string, type: AssistantState['type'] = 'guide', textVoz?: string) => {
    setAssistant({ msg, tip, type });
    const toSpeak = textVoz || msg;
    const now = Date.now();
    // Anti-spam: no repetir el mismo mensaje más que cada 3.5s
    if (toSpeak !== lastSpeechRef.current || (now - lastSpeechTimeRef.current) > 3500) {
      lastSpeechRef.current = toSpeak;
      lastSpeechTimeRef.current = now;
      if (voiceEnabled) speak(toSpeak);
    }
  }, [voiceEnabled]);

  // ── Calcular score de calidad de una muestra ──────────────────────────────
  const calcQuality = useCallback((
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>,
    video: HTMLVideoElement
  ): { score: number; detail: string } => {
    const box = detection.detection.box;
    const confidence = detection.detection.score;
    const faceArea = (box.width * box.height) / (video.videoWidth * video.videoHeight);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const offX = Math.abs(centerX - video.videoWidth / 2) / video.videoWidth;
    const offY = Math.abs(centerY - video.videoHeight / 2) / video.videoHeight;

    let score = 100;
    const issues: string[] = [];

    // Confianza de detección (0-30pts)
    const confScore = Math.round(confidence * 30);
    score = score - 30 + confScore;
    if (confidence < 0.8) issues.push('confianza baja');

    // Tamaño de cara (0-25pts)
    const areaScore = faceArea < 0.06 ? 0 : faceArea < 0.10 ? 10 : faceArea < 0.15 ? 17 : 25;
    score = score - 25 + areaScore;
    if (areaScore < 17) issues.push('cara pequeña');

    // Centrado (0-25pts)
    const centScore = (offX + offY) > 0.5 ? 0 : (offX + offY) > 0.3 ? 12 : (offX + offY) > 0.15 ? 20 : 25;
    score = score - 25 + centScore;
    if (centScore < 20) issues.push('fuera de centro');

    // Ojos abiertos (0-20pts)
    let earScore = 20;
    try {
      const lm = detection.landmarks;
      const ear = (eye: any[]) => {
        const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        return (v1 + v2) / (2 * h);
      };
      const earVal = (ear(lm.getLeftEye()) + ear(lm.getRightEye())) / 2;
      earScore = earVal < 0.15 ? 0 : earVal < 0.20 ? 10 : 20;
      if (earScore < 10) issues.push('ojos cerrados');
    } catch (_) { }
    score = score - 20 + earScore;

    return { score: Math.max(0, Math.min(100, score)), detail: issues.join(', ') || 'óptima' };
  }, []);

  // ── Procesar pool y enviar ────────────────────────────────────────────────
  const procesarCaptura = useCallback(async (pool: SampleData[], force = false) => {
    setEstado('analizando');

    guide(
      `Analizando ${pool.length} capturas para seleccionar las ${BEST_N} mejores...`,
      undefined, 'guide',
      `Perfecto. Tengo ${pool.length} muestras. Ahora selecciono las ${BEST_N} más diversas para maximizar la precisión.`
    );

    // Selección de los mejores descriptores más diversos
    const selected = selectMostDiverse(pool, BEST_N);
    const avgScore = Math.round(selected.reduce((s, x) => s + x.quality, 0) / selected.length);

    setEstado('verificando');
    guide(
      `Seleccioné ${selected.length} muestras con calidad promedio ${avgScore}/100. Verificando unicidad biométrica...`,
      undefined, 'guide',
      `Muestras seleccionadas con calidad de ${avgScore} sobre 100. Verificando que el rostro sea único.`
    );

    // Calcular promedio para anti-duplicado legacy
    const avg = new Float32Array(128).fill(0);
    for (const s of selected) {
      for (let i = 0; i < 128; i++) avg[i] += s.descriptor[i] / selected.length;
    }

    // Obtener token de sesión actual para pasar el RLS
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch('/api/empleados/actualizar-rostro', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          empleadoId,
          face_descriptors: selected.map(s => Array.from(s.descriptor)),
          face_descriptor: Array.from(avg),
          force
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === 'ROSTRO_DUPLICADO') {
        setEmpleadoDuplicado(data.empleado_duplicado);
        setTotalComparaciones(data.total_comparaciones || 0);
        setEstado('duplicado');
        guide(
          'Este rostro ya fue registrado para otro funcionario.',
          'El sistema de seguridad bloqueó el enrolamiento duplicado.',
          'error',
          'Este rostro ya pertenece a otro funcionario. El enrolamiento fue bloqueado.'
        );
        return;
      }

      if (!res.ok) throw new Error(data.error || 'ERROR DEL SERVIDOR');

      setTotalComparaciones(data.total_comparaciones || 0);
      setEstado('completado');
      playSuccessChime();
      guide(
        `¡Enrolamiento completado con éxito! Calidad de registro: ${avgScore}/100`,
        `Se guardaron ${BEST_N} vectores biométricos optimizados para mayor precisión.`,
        'success',
        `¡Excelente! El perfil biométrico fue registrado con una calidad de ${avgScore} sobre cien. Ya puedes marcar asistencia.`
      );
      setTimeout(() => onSuccess?.(Array.from(avg)), 2000);

    } catch (err: any) {
      setEstado('error');
      setError(err.message || 'ERROR AL GUARDAR EL PERFIL BIOMÉTRICO');
      guide('Ocurrió un error al guardar el perfil.', err.message, 'error', 'Error al guardar. Por favor intenta nuevamente.');
    }
  }, [empleadoId, onSuccess, guide]);

  // ── Loop de detección ─────────────────────────────────────────────────────
  const detectar = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== 4) return;
    if (video.videoWidth === 0) return;
    if (processingRef.current || isDetectingRef.current) return;

    isDetectingRef.current = true;
    try {

    // Análisis de iluminación periódico (cada 2s)
    const now = Date.now();
    if (now - lightingCheckRef.current > 2000) {
      lightingCheckRef.current = now;
      const light = analyzeLighting(video);
      setLightWarn(light.msg);
      if (light.score < 50) {
        guide(light.msg, undefined, 'warn', light.msg);
        return;
      }
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const options = ssdOptionsRef.current || new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE });
    const detecciones = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const resized = faceapi.resizeResults(detecciones, displaySize);
      for (const d of resized) {
        // Dibuja los 68 puntos biométricos y malla de facciones
        faceapi.draw.drawFaceLandmarks(canvas, [d]);

        // Dibuja esquinas tácticas HUD alrededor del rostro
        const box = d.detection.box;
        const q = d.detection.score;
        const color = q > 0.85 ? '#34d399' : '#38bdf8';
        const cornerLen = Math.min(box.width, box.height) * 0.2;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        // Esquina superior izquierda
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + cornerLen);
        ctx.lineTo(box.x, box.y);
        ctx.lineTo(box.x + cornerLen, box.y);
        ctx.stroke();

        // Esquina superior derecha
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - cornerLen, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + cornerLen);
        ctx.stroke();

        // Esquina inferior izquierda
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + box.height - cornerLen);
        ctx.lineTo(box.x, box.y + box.height);
        ctx.lineTo(box.x + cornerLen, box.y + box.height);
        ctx.stroke();

        // Esquina inferior derecha
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
        ctx.stroke();

        ctx.shadowBlur = 0;
      }
    }

    // Sin cara
    if (detecciones.length === 0) {
      setQuality({ detec: false, pos: false, eyes: false });
      setQualityScore(0);
      setFeedback('COLOCA TU ROSTRO FRENTE A LA CÁMARA');
      guide(
        'No detecto ningún rostro. Colócate frente a la cámara.',
        'Asegúrate de que haya buena iluminación y de que tu cara sea visible.',
        'warn',
        'No detecto tu rostro. Por favor colócate frente a la cámara con buena luz.'
      );
      return;
    }

    // Múltiples caras
    if (detecciones.length > 1) {
      setQuality({ detec: true, pos: false, eyes: false });
      setFeedback('SOLO UNA PERSONA FRENTE A LA CÁMARA');
      guide('Veo más de una persona.', 'El enrolamiento biométrico requiere que solo tú estés frente a la cámara.', 'warn');
      return;
    }

    const det = detecciones[0];
    const box = det.detection.box;
    setQuality(q => ({ ...q, detec: true }));

    // Verificar centrado
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const offX = Math.abs(centerX - video.videoWidth / 2) / video.videoWidth;
    const offY = Math.abs(centerY - video.videoHeight / 2) / video.videoHeight;
    const bisCentrado = offX <= CENTRADO_MARGEN && offY <= CENTRADO_MARGEN;
    setQuality(q => ({ ...q, pos: bisCentrado }));

    if (!bisCentrado) {
      setFeedback('CENTRA TU ROSTRO EN EL ÓVALO');
      const dirs = [];
      if (offX > CENTRADO_MARGEN) dirs.push(centerX < video.videoWidth / 2 ? 'hacia la derecha' : 'hacia la izquierda');
      if (offY > CENTRADO_MARGEN) dirs.push(centerY < video.videoHeight / 2 ? 'hacia abajo' : 'hacia arriba');
      guide(
        `Mueve tu cabeza ${dirs.join(' y ')} para centrarte en el óvalo.`,
        undefined, 'warn',
        `Muévete ${dirs.join(' y ')}.`
      );
      return;
    }

    // Verificar tamaño
    const faceArea = (box.width * box.height) / (video.videoWidth * video.videoHeight);
    if (faceArea < AREA_MINIMA) {
      setFeedback('ACÉRCATE UN POCO MÁS A LA CÁMARA');
      guide('Estás demasiado lejos.', 'Acércate unos 40-60 cm a la cámara.', 'warn', 'Acércate un poco más a la cámara.');
      return;
    }
    if (faceArea > 0.75) {
      setFeedback('ALÉJATE UN POCO');
      guide('Estás demasiado cerca.', 'Mantén una distancia de 40-60 cm.', 'warn', 'Aléjate un poco de la cámara.');
      return;
    }

    // Verificar ojos
    let eyesOpen = true;
    try {
      const lm = det.landmarks;
      const ear = (eye: any[]) => {
        const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        return (v1 + v2) / (2 * h);
      };
      eyesOpen = ear(lm.getLeftEye()) > 0.15 && ear(lm.getRightEye()) > 0.15;
      setQuality(q => ({ ...q, eyes: eyesOpen }));
      if (!eyesOpen) {
        setFeedback('ABRE TUS OJOS');
        guide('Por favor abre bien los ojos.', 'Los ojos deben estar completamente abiertos para capturar correctamente.', 'warn', 'Abre bien los ojos.');
        return;
      }
    } catch (_) {
      setQuality(q => ({ ...q, eyes: true }));
    }

    // ── CALCULAR CALIDAD DE ESTA MUESTRA ──────────────────────────────────
    const qResult = calcQuality(det, video);
    setQualityScore(qResult.score);

    if (poolRef.current.length >= MAX_POOL) return;

    if (qResult.score < MIN_QUALITY_SCORE) {
      // Muestra rechazada
      setRejectedSamples(r => r + 1);
      const tipRec = qResult.score < 50
        ? 'La calidad es muy baja. Mejora la iluminación y el centrado.'
        : `Calidad insuficiente (${qResult.score}/100): ${qResult.detail}. Ajusta tu posición.`;
      setFeedback(`CALIDAD BAJA: ${qResult.score}/100 — AJUSTA TU POSICIÓN`);
      guide(tipRec, undefined, 'warn', tipRec);
      return;
    }

    // ── MUESTRA ACEPTADA ──────────────────────────────────────────────────
    playCaptureBeep();
    poolRef.current = [...poolRef.current, { descriptor: det.descriptor, quality: qResult.score, qualityDetail: qResult.detail }];
    const n = poolRef.current.length;
    const accepted = n;
    setProgreso(n);
    setAcceptedSamples(accepted);
    setEstado('capturando');

    // Guías progresivas según cuántas muestras llevamos
    const progressGuides = [
      'Perfecto, mantén esa posición.',
      'Muy bien. Ahora gira levemente a la izquierda.',
      'Excelente. Vuelve al centro.',
      'Bien. Gira levemente a la derecha.',
      'Perfecto. Mira al frente.',
      'Casi. Levanta un poco el mentón.',
      'Muy bien. Posición normal.',
      'Último grupo de muestras. Mantén la posición.',
    ];
    const guideMsg = progressGuides[Math.min(n - 1, progressGuides.length - 1)];
    setFeedback(`MUESTRA ${n}/${MAX_POOL} — CALIDAD: ${qResult.score}/100`);
    guide(
      `Muestra ${n} de ${MAX_POOL} capturada — calidad ${qResult.score}/100. ${guideMsg}`,
      undefined, 'guide',
      guideMsg
    );

    // Si tenemos suficientes muestras buenas, finalizar
    if (n >= MAX_POOL) {
      isRunningRef.current = false;
      processingRef.current = true;
      await procesarCaptura(poolRef.current);
    }
    } finally {
      isDetectingRef.current = false;
    }
  }, [procesarCaptura, guide, calcQuality]);

  // ── PASO 2: Inicializar cámara ────────────────────────────────────────────
  const iniciarCamara = useCallback(async (): Promise<boolean> => {
    try {
      setEstado('iniciando_camara');
      setFeedback('INICIALIZANDO SENSOR DE CÁMARA...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (!videoRef.current) return false;
      const v = videoRef.current;
      v.srcObject = stream;

      try {
        await v.play();
      } catch (_) {}

      await new Promise<void>((resolve) => {
        if (v.readyState >= 2) return resolve();
        let timeoutId: any;
        const check = setInterval(() => {
          if (v.readyState >= 2) {
            clearInterval(check);
            clearTimeout(timeoutId);
            resolve();
          }
        }, 50);
        timeoutId = setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 3000);
      });
      return true;
    } catch (err: any) {
      console.error('Error iniciando cámara:', err);
      setEstado('error');
      setError('NO SE PUDO ACCEDER A LA CÁMARA.');
      return false;
    }
  }, []);

  // ── PASO 1: Boot ──────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const init = async () => {
      setFeedback('CARGANDO MODELOS DE IA...');
      try {
        if (!modelsLoadedGlobal) {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]);
          modelsLoadedGlobal = true;
        }
      } catch {
        setEstado('error');
        setError('ERROR AL CARGAR MODELOS FACIALES.');
        return;
      }
      const ok = await iniciarCamara();
      if (!ok) return;

      setEstado('listo');
      setFeedback('SISTEMA LISTO');
      playStartChime();
      isRunningRef.current = true;
      poolRef.current = [];
      processingRef.current = false;
      setProgreso(0);
      setAcceptedSamples(0);
      setRejectedSamples(0);

      guide(
        'Sistema listo. Colócate frente a la cámara con buena iluminación y mira directamente al lente.',
        'El asistente evaluará la calidad de cada captura automáticamente.',
        'guide',
        'Sistema listo. Por favor colócate frente a la cámara con buena iluminación y mira directamente al lente.'
      );

      interval = setInterval(async () => {
        if (!isRunningRef.current) return;
        await detectar();
      }, DETECTION_INTERVAL_MS);
    };
    init();
    return () => {
      isRunningRef.current = false;
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch (_) {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reintentar = () => {
    poolRef.current = [];
    processingRef.current = false;
    setProgreso(0);
    setAcceptedSamples(0);
    setRejectedSamples(0);
    setEmpleadoDuplicado(null);
    setError(null);
    setEstado('listo');
    setFeedback('POSICIONA TU ROSTRO EN EL ÓVALO');
    isRunningRef.current = true;
    guide('Reintentando. Colócate frente a la cámara.', undefined, 'guide', 'Reintentando enrolamiento.');
  };


  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full relative bg-slate-900 overflow-hidden flex flex-col rounded-2xl">
      {/* ── CÁMARA ──────────────────────────────────────────────────────── */}
      <video ref={videoRef} autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Header flotante con HUD Biométrico en Tiempo Real */}
      <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-slate-950/90 via-slate-900/40 to-transparent flex justify-between items-start z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h2 className="text-white font-black tracking-widest uppercase text-xs">Sensor Biométrico 3D • 68 Puntos</h2>
          </div>
          <p className="text-blue-300/80 text-[11px] font-semibold mt-1">Escaneo facial guiado de alta precisión</p>
        </div>

        {/* HUD Diagnóstico de Calidad */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className={lightWarn ? 'text-amber-400' : 'text-emerald-400'}>💡 Luz</span>
              <span className={quality.pos ? 'text-emerald-400' : 'text-slate-400'}>🎯 Centro</span>
              <span className={quality.eyes ? 'text-emerald-400' : 'text-slate-400'}>👁️ Ojos</span>
            </div>
            {qualityScore > 0 && (
              <div className="pl-2 border-l border-slate-700 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">Score:</span>
                <span className={`text-xs font-mono font-bold ${qualityScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{qualityScore}%</span>
              </div>
            )}
          </div>

          <button onClick={onCancel} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all shadow-md">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Óvalo guía inteligente */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className={`w-[38vw] h-[50vw] max-w-[260px] max-h-[340px] min-w-[140px] min-h-[185px] border-4 rounded-[50%] transition-all duration-500 
          ${quality.detec && quality.pos ? 'border-emerald-400 shadow-[0_0_80px_rgba(52,211,153,0.4)] scale-105' : 'border-amber-400/60 animate-pulse'}`} />
      </div>

      {/* Instrucción dinámica flotante con diseño futurista */}
      {(estado === 'listo' || estado === 'capturando') && (
        <div className="absolute bottom-20 inset-x-0 flex flex-col items-center gap-3 z-10 animate-fadeIn px-4">
          <div className="px-6 py-3 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl max-w-md w-full text-center">
            <p className="text-xs font-black text-emerald-400 tracking-[0.15em] uppercase drop-shadow-sm">{feedback}</p>
            {lightWarn && <p className="text-[11px] text-amber-300 font-semibold mt-1">{lightWarn}</p>}
          </div>

          {/* Pasos Progresivos de Pose */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((stepIdx) => {
              const currentStep = Math.min(Math.floor((progreso / MAX_POOL) * 4) + 1, 4);
              const isActive = stepIdx <= currentStep;
              return (
                <div key={stepIdx} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-800'
                }`} />
              );
            })}
          </div>
        </div>
      )}

      {/* Progreso suave */}
      {estado === 'capturando' && (
        <div className="absolute bottom-6 inset-x-12 z-10 animate-fadeIn">
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"
              style={{ width: `${(progreso / MAX_POOL) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Overlays de estado (Cargando, Analizando, Completado, Error) */}
      <div className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md transition-all duration-500
        ${(estado === 'listo' || estado === 'capturando') ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-slate-900/90'}`}>
        
        {(estado === 'cargando_modelos' || estado === 'iniciando_camara') && (
           <div className="text-center animate-fadeIn">
             <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
             <p className="text-xs font-bold text-white tracking-widest uppercase">Preparando cámara...</p>
           </div>
        )}

        {(estado === 'analizando' || estado === 'verificando') && (
           <div className="text-center animate-fadeIn">
             <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
             <p className="text-xs font-bold text-white tracking-widest uppercase">Procesando seguridad biométrica...</p>
           </div>
        )}

        {estado === 'completado' && (
          <div className="text-center animate-fadeIn max-w-sm px-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Registro Exitoso</h3>
            <p className="text-sm text-slate-400 mb-8">La identidad ha sido encriptada y guardada correctamente en el sistema.</p>
          </div>
        )}

        {estado === 'duplicado' && empleadoDuplicado && (
          <div className="text-center animate-fadeIn max-w-sm px-6">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Advertencia de Similitud</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              El sistema detectó coincidencia con {empleadoDuplicado.nombre} {empleadoDuplicado.apellido}. Si se trata de otra persona, presiona "Forzar Enrolamiento".
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => procesarCaptura(poolRef.current, true)} 
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-colors shadow-md"
              >
                ✓ Forzar Enrolamiento de Todos Modos
              </button>
              <div className="flex gap-2">
                <button onClick={reintentar} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-colors">Reintentar</button>
                <button onClick={onCancel} className="flex-1 py-2.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {estado === 'error' && (
          <div className="text-center animate-fadeIn max-w-sm px-6">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error Inesperado</h3>
            <p className="text-sm text-slate-400 mb-6">No pudimos completar el registro en este momento. Por favor, asegúrese de tener permisos de cámara o vuelva a intentarlo.</p>
            <div className="flex gap-3">
              <button onClick={reintentar} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-colors">Reintentar</button>
              <button onClick={onCancel} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs tracking-widest uppercase transition-colors">Cancelar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

