'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

interface LectorQRProps {
  onScanSuccess: (codigoQr: string) => void;
  onScanError?: (error: string) => void;
}

export default function LectorQR({ onScanSuccess, onScanError }: LectorQRProps) {
  const [iniciado, setIniciado] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const qrRegionId = 'reader-qr-kiosco';

  useEffect(() => {
    let isMounted = true;

    const startScanner = async (attempt = 1) => {
      try {
        const container = document.getElementById(qrRegionId);
        if (container) {
          container.innerHTML = '';
        }

        const html5Qrcode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'user' },
          {
            fps: 30, // Máximo FPS para respuesta en tiempo real (<100ms)
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              return { width: Math.floor(minDim * 0.75), height: Math.floor(minDim * 0.75) };
            },
            aspectRatio: 1.0,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true // Detección por hardware GPU nativo si está disponible
            }
          } as any,
          (decodedText) => {
            const now = Date.now();
            if (isMounted && decodedText && (now - lastScannedTimeRef.current > 1500)) {
              lastScannedTimeRef.current = now;
              // Sonido instantáneo de escaneo
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 1046.5; // C6 Pitch cristalino
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
                setTimeout(() => {
                  try { audioCtx.close(); } catch (_) {}
                }, 250);
              } catch (_) {}

              onScanSuccess(decodedText);
            }
          },
          () => {}
        );

        if (isMounted) setIniciado(true);
      } catch (err: any) {
        if (attempt < 3 && isMounted) {
          // Reintentar si la cámara estaba terminando de liberarse de la pantalla anterior
          await new Promise(r => setTimeout(r, 250));
          if (isMounted) return startScanner(attempt + 1);
        }
        console.error('Error al iniciar escáner de QR:', err);
        if (isMounted) {
          setErrorCamara('No se pudo activar la cámara para lectura de QR. Verifique los permisos.');
          if (onScanError) onScanError(err?.message || 'Error de cámara');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          const s = scannerRef.current;
          scannerRef.current = null;
          s.stop()
            .then(() => {
              try { s.clear(); } catch (e) {}
            })
            .catch(err => {
              const errorStr = String(err);
              if (!errorStr.includes('removeChild') && !errorStr.includes('NotFoundError')) {
                console.warn('Error deteniendo escáner QR:', err);
              }
            });
        } catch (e) {
          // Ignorar
        }
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-[#1E3A8A] flex items-center justify-center">
        
        {/* Contenedor HTML5-QRCode */}
        <div id={qrRegionId} className="w-full h-full object-cover"></div>

        {/* Superposición visual táctica (Marco de Escaneo Kiosco) */}
        {iniciado && !errorCamara && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Esquinas destacadas */}
            <div className="w-64 h-64 border-2 border-emerald-400/60 rounded-2xl relative animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
              
              {/* Línea Láser Escáner */}
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
            </div>
          </div>
        )}

        {/* Loader o Estado de Error */}
        {!iniciado && !errorCamara && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent animate-spin rounded-full"></div>
            <span className="text-sm font-bold text-slate-300">Activando Cámara Kiosco...</span>
          </div>
        )}

        {errorCamara && (
          <div className="absolute inset-0 bg-slate-900 p-6 flex flex-col items-center justify-center text-center gap-3 text-rose-400">
            <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-bold leading-relaxed">{errorCamara}</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-center space-y-1">
        <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Paso 1: Muestra tu Código QR</p>
        <p className="text-xs text-slate-500 font-medium">Ubica el código de tu carnet digital o físico frente a la cámara</p>
      </div>
    </div>
  );
}
