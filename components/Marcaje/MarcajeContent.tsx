'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import PantallaMarcaje from './PantallaMarcaje';

export default function MarcajeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [estacionSession, setEstacionSession] = useState<{ usuario?: string; sede?: string; estacion?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('estacion_session');
      if (stored) {
        setEstacionSession(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  const rawSede = searchParams.get('sede');
  const rawPunto = searchParams.get('punto');
  
  const sedeUrl = rawSede || estacionSession?.sede || null;
  const puntoDeMarcaje = rawPunto || estacionSession?.estacion || process.env.NEXT_PUBLIC_IPAD_1_NAME || 'Recepción';
  const ipadId = searchParams.get('ipad') || 'ipad-1';

  useEffect(() => {
    if (!sedeUrl) {
      import('@/lib/supabase').then(({ authService }) => {
        authService.getCurrentUser().then(({ user }) => {
          if (user?.email) {
            const emailLower = user.email.toLowerCase();
            if (emailLower.includes('marcaje')) {
              const sedeDetected = emailLower.includes('caes') ? 'CAES' : 'ROOS';
              router.replace(`/marcaje?sede=${sedeDetected}&punto=${encodeURIComponent(puntoDeMarcaje)}&ipad=${ipadId}`);
            }
          }
        });
      });
    }
  }, [sedeUrl, puntoDeMarcaje, ipadId, router]);

  if (!sedeUrl) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 bg-[#1E3A8A]/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Configuración Inicial</h2>
            <p className="text-xs text-slate-400 mt-1">Seleccione la sede para esta estación de marcaje</p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => router.replace(`/marcaje?sede=ROOS&punto=${encodeURIComponent(puntoDeMarcaje)}&ipad=${ipadId}`)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors"
            >
              SEDE ROOS
            </button>
            <button 
              onClick={() => router.replace(`/marcaje?sede=CAES&punto=${encodeURIComponent(puntoDeMarcaje)}&ipad=${ipadId}`)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors"
            >
              SEDE CAES
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PantallaMarcaje puntoDeMarcaje={puntoDeMarcaje} ipadId={ipadId} sede={sedeUrl} />;
}
