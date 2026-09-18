'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { facialEngine } from '@/lib/facialRecognitionEngine';
import { Empleado } from '@/types';
import { marcajesFallidosService } from '@/lib/supabase';

const UMBRAL_DISTANCIA = 0.42;

interface VerificacionFacialUnoAUnoProps {
  empleado: Empleado;
  puntoMarcaje?: string;
  onSuccess: (fotoBase64: string, confianza: number, liveDescriptor?: Float32Array) => void;
  onFailure: (distancia: number, motivo: string) => void;
  onCancel: () => void;
}

export default function VerificacionFacialUnoAUno({
  empleado,
  puntoMarcaje = 'Puerta Principal',
  onSuccess,
  onFailure,
  onCancel
}: VerificacionFacialUnoAUnoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRunningRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const [estado, setEstado] = useState<'cargando' | 'escaneando' | 'exito' | 'fallo'>('cargando');
  const [feedback, setFeedback] = useState('VERIFICANDO IDENTIDAD...');
  const [distanciaActual, setDistanciaActual] = useState<number | null>(null);

  // ── Inicializar Modelos y Cámara ──────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const init = async (attempt = 1) => {
      try {
        setFeedback('ACTIVANDO SENSOR DE VERIFICACIÓN 1:1...');
        await facialEngine.loadModels();

        if (!isMounted) return;

        // Breve pausa para asegurar que el escáner QR anterior liberó los tracks de la cámara
        await new Promise(r => setTimeout(r, 150));
        if (!isMounted) return;

        setFeedback('ACTIVANDO SENSOR DE VERIFICACIÓN...');
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
        } catch (e) {
          if (attempt < 3 && isMounted) {
            await new Promise(r => setTimeout(r, 300));
            if (isMounted) return init(attempt + 1);
          }
          throw e;
        }

        streamRef.current = stream;

        if (videoRef.current && isMounted) {
          const v = videoRef.current;
          v.srcObject = stream;
          try { await v.play(); } catch (_) {}
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
          setEstado('escaneando');
          isRunningRef.current = true;
          startLoop();
        }
      } catch (err) {
        console.error('Error al inicializar verificación 1:1:', err);
        if (isMounted) {
          onFailure(1.0, 'No se pudo acceder a la cámara para verificación facial');
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      isRunningRef.current = false;
      isVerifyingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (_) {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [empleado]);

  // ── Loop de Detección 1:1 Ultra Rápida ───────────────────────────────────
  const startLoop = useCallback(() => {
    if (!isRunningRef.current) return;

    // Pre-convertir vectores guardados a Float32Array fuera del loop (0 ms overhead por frame)
    const rawStored = empleado.face_descriptor;
    if (!rawStored) {
      onFailure(1.0, 'El empleado no cuenta con perfil biométrico facial registrado');
      return;
    }

    const storedVectors: Float32Array[] = [];
    if (Array.isArray(rawStored) && Array.isArray(rawStored[0])) {
      (rawStored as any[]).forEach(v => storedVectors.push(new Float32Array(v)));
    } else {
      storedVectors.push(new Float32Array(rawStored as any));
    }

    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    const interval = setInterval(async () => {
      if (!isRunningRef.current || !videoRef.current) {
        clearInterval(interval);
        return;
      }
      if (isVerifyingRef.current) return;

      const video = videoRef.current;
      if (video.paused || video.ended || video.readyState < 3) return;

      isVerifyingRef.current = true;
      try {
        const detection = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setFeedback('MIRA DE FRENTE A LA CÁMARA');
          return;
        }

        const liveDescriptor = detection.descriptor;

        // Comparación instantánea 1:1 contra muestras pre-convertidas
        let minDistance = Infinity;
        for (const s of storedVectors) {
          const dist = faceapi.euclideanDistance(liveDescriptor, s);
          if (dist < minDistance) minDistance = dist;
        }

        setDistanciaActual(minDistance);

        // ── VERIFICACIÓN 1:1 EXITOSA ──────────────────────────────────────
        if (minDistance <= UMBRAL_DISTANCIA) {
          isRunningRef.current = false;
          clearInterval(interval);
          setEstado('exito');
          setFeedback('¡IDENTIDAD VERIFICADA!');

          // Capturar foto instantánea
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) ctx.drawImage(video, 0, 0);
          const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
          const confianza = Math.round((1 - minDistance) * 100);
          onSuccess(fotoBase64, confianza, liveDescriptor);
        } else if (minDistance > 0.65) {
          setFeedback('ROSTRO NO COINCIDE — MIRA AL FRENTE');
        } else {
          setFeedback('VERIFICANDO RASGOS FACIALES...');
        }
      } catch (e) {
        console.error('Error en loop 1:1:', e);
      } finally {
        isVerifyingRef.current = false;
      }
    }, 150);
  }, [empleado, onSuccess, onFailure]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto animate-fadeIn">
      
      {/* Tarjeta Informativa de Identidad Reclamada */}
      <div className="w-full bg-slate-900 border-2 border-[#1E3A8A] rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg text-white">
        <div className="flex items-center gap-3">
          {empleado.foto_url ? (
            <img src={empleado.foto_url} alt={empleado.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-emerald-400">
              {empleado.nombre[0]}
            </div>
          )}
          <div>
            <h4 className="font-bold text-base text-white">{empleado.nombre} {empleado.apellido}</h4>
            <p className="text-xs text-blue-300 font-semibold">{empleado.cargo || 'Funcionario'} • {empleado.departamento || 'General'}</p>
          </div>
        </div>
        <div className="bg-[#1E3A8A] px-3 py-1.5 rounded-lg text-right">
          <span className="text-[10px] font-bold text-blue-200 uppercase block">Código QR</span>
          <span className="font-mono text-xs font-bold text-emerald-400">{empleado.qr_code}</span>
        </div>
      </div>

      {/* Visor de Cámara de Verificación 1:1 */}
      <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-[#1E3A8A] flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

        {/* Óvalo de Enfoque */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-64 h-80 border-4 rounded-[50%] transition-all duration-300 ${
            estado === 'exito' ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.8)]' : 'border-amber-400/80 animate-pulse'
          }`} />
        </div>

        {/* Banner de Feedback */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/50 text-center">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            estado === 'exito' ? 'text-emerald-400' : 'text-amber-300'
          }`}>
            {feedback}
          </span>
          {distanciaActual !== null && (
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Verificación 1:1 (Distancia: {distanciaActual.toFixed(3)})
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onCancel}
        className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
      >
        CANCELAR / CAMBIAR DE CÓDIGO QR
      </button>
    </div>
  );
}
