'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { facialEngine } from '@/lib/facialRecognitionEngine';

interface CamaraReconocimientoProps {
  onRecognized: (empleado: any) => void;
  employees: any[];
}

export default function CamaraReconocimiento({ onRecognized, employees }: CamaraReconocimientoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [feedback, setFeedback] = useState('INICIALIZANDO SISTEMA BIOMÉTRICO...');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  // ── Estado para detección sin marcar ("detectado pero esperando botón") ──
  const [empleadoPreview, setEmpleadoPreview] = useState<any | null>(null);
  const procesandoRef = useRef(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        await facialEngine.loadModels();
        setIsReady(true);
        setFeedback('SISTEMA ACTIVO. POSICIÓNATE.');
      } catch {
        setError('FALLO EN SERVICIOS BIOMÉTRICOS');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady || !videoRef.current) return;
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('ACCESO A CÁMARA DENEGADO');
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [isReady]);

  const isScanningRef = useRef(false);

  // ── Loop de reconocimiento: solo detecta, NO registra ──────────────────────
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(async () => {
      // Si ya hay un empleado esperando confirmación, en cooldown, o procesando anterior, omitir frame
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (empleadoPreview || cooldownRef.current || isScanningRef.current) return;

      isScanningRef.current = true;
      try {
        const result = await facialEngine.recognize(
          videoRef.current,
          employees.map(e => ({ id: e.id, descriptor: e.face_descriptor }))
        );

        setLastCheck(Date.now());

        if (result) {
          const fullEmployee = employees.find(e => e.id === result.id);
          if (fullEmployee) {
            setFeedback(`✅ IDENTIFICADO: ${fullEmployee.nombre.toUpperCase()}`);
            setEmpleadoPreview(fullEmployee);
          }
        } else {
          setFeedback('📍 ESCANEANDO... MANTÉN EL ROSTRO VISIBLE');
        }
      } catch {
        // silencioso
      } finally {
        isScanningRef.current = false;
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isReady, employees, empleadoPreview]);

  // ── El empleado presiona "Registrar Asistencia" ────────────────────────────
  const handleConfirmar = useCallback(() => {
    if (!empleadoPreview || procesandoRef.current) return;
    procesandoRef.current = true;
    cooldownRef.current = true;

    onRecognized(empleadoPreview);
    setEmpleadoPreview(null);
    setFeedback('📍 ESCANEANDO... MANTÉN EL ROSTRO VISIBLE');

    // Cooldown de 6 segundos antes de permitir nuevo reconocimiento
    setTimeout(() => {
      procesandoRef.current = false;
      cooldownRef.current = false;
    }, 6000);
  }, [empleadoPreview, onRecognized]);

  const handleCancelar = useCallback(() => {
    setEmpleadoPreview(null);
    setFeedback('📍 ESCANEANDO... MANTÉN EL ROSTRO VISIBLE');
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto glass-card overflow-hidden border-white/5 shadow-2xl animate-fadeIn">

      {/* Visor de Cámara */}
      <div className="relative aspect-square bg-[#0A0E1A] flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-8 space-y-4">
            <div className="w-12 h-12 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-xl font-bold">!</span>
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase leading-relaxed">
              {error}<br />
              <span className="text-white/40 font-normal">VERIFICA PERMISOS DE CÁMARA</span>
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror opacity-70 grayscale-[30%]"
            />

            {/* Overlay de Escaneo */}
            <div className="absolute inset-0 pointer-events-none p-12">
              <div className="absolute inset-0 border-[60px] border-[#0A0E1A]/60"></div>
              <div className="relative w-full h-full border border-white/10 rounded-[2rem]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/50 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/50 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/50 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/50 rounded-br-lg"></div>
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent animate-scan"></div>
                <div className="absolute top-4 right-4 flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-1 h-1 rounded-full bg-blue-500/40 ${((lastCheck / 1000) >> i) % 2 ? 'opacity-100' : 'opacity-20'}`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── OVERLAY DE CONFIRMACIÓN (se superpone a la cámara) ─────── */}
            {empleadoPreview && (
              <div className="absolute inset-0 bg-[#0A0E1A]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-5 px-8 z-20 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="text-2xl font-black text-emerald-300">
                    {empleadoPreview.nombre?.[0]}{empleadoPreview.apellido?.[0]}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg uppercase tracking-tight">{empleadoPreview.nombre} {empleadoPreview.apellido}</p>
                  <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">{empleadoPreview.departamento || empleadoPreview.cargo || 'Funcionario'}</p>
                </div>
                <button
                  onClick={handleConfirmar}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Registrar Asistencia
                </button>
                <button
                  onClick={handleCancelar}
                  className="text-[11px] font-bold text-white/20 hover:text-white/50 uppercase tracking-widest transition-colors"
                >
                  No soy yo — Cancelar
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer de Feedback */}
      <div className="bg-[#0A1221]/80 px-8 py-5 flex flex-col items-center justify-center border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${feedback.includes('✅') ? 'bg-[#10B981]' : 'bg-blue-500 animate-pulse'}`}></div>
          <span className="text-white/80 font-bold tracking-[0.2em] text-[10px] uppercase">
            {empleadoPreview ? 'CONFIRMA TU IDENTIDAD PARA MARCAR' : feedback}
          </span>
        </div>
      </div>

      <style>{`
        .mirror { transform: scaleX(-1); }
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          40% { opacity: 1; }
          60% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
