'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanInput = email.trim().toLowerCase();

    // 1. PRIMER INTENTO: Verificar si es usuario de Estación de Marcaje Kiosco
    try {
      const respEstacion = await fetch('/api/auth/estacion-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: cleanInput, password })
      });

      if (respEstacion.ok) {
        const resData = await respEstacion.json();
        if (resData.success && resData.data) {
          const { usuario: uEst, sede: sEst, estacion: eEst } = resData.data;
          // Guardar sesión de estación en localStorage
          localStorage.setItem('estacion_session', JSON.stringify({
            usuario: uEst,
            sede: sEst,
            estacion: eEst,
            timestamp: Date.now()
          }));

          // Redireccionar al marcaje con la sede y estación asignada
          window.location.href = `/marcaje?sede=${sEst}&punto=${encodeURIComponent(eEst)}`;
          return;
        }
      }
    } catch (_err) {
      console.log('No es usuario de estación o error al consultar API estación, continuando con Auth Supabase...');
    }

    // 2. SEGUNDO INTENTO: Autenticación estándar Supabase (Admins / RRHH / Cuentas marcaje legadas)
    const finalEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@mao.com`;

    try {
      const { data, error } = await authService.signIn(finalEmail, password);

      if (error) {
        if (error.message.includes('Email logins are disabled')) {
          throw new Error('El inicio de sesión por correo está desactivado en Supabase. Debes activarlo en Supabase Dashboard > Authentication > Providers > Email.');
        }
        throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales inválidas. Por favor verifique su correo o usuario y contraseña.' : error.message);
      }

      if (data.user) {
        // Limpiar sesión de estación previa si entra un usuario Admin
        localStorage.removeItem('estacion_session');

        const userEmail = (data.user.email || finalEmail).toLowerCase();
        if (userEmail.includes('marcaje')) {
          const sede = userEmail.includes('caes') ? 'CAES' : 'ROOS';
          window.location.href = `/marcaje?sede=${sede}`;
          return;
        } else {
          window.location.href = '/admin';
          return;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1E3A8A] to-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      
      {/* DECORACIÓN DISCRETA DE FONDO */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10 animate-fadeIn">
        
        {/* BRANDING CORPORATIVO LIMPIO Y SOBRIO */}
        <div className="text-center mb-8 space-y-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl flex items-center justify-center mx-auto text-blue-100">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Bienvenido</h1>
            <p className="text-sm text-blue-200 font-medium mt-1">Colegio Manos a la Obra • RRHH</p>
          </div>
        </div>

        {/* CONTENEDOR TARJETA BLANCA MINIMALISTA */}
        <div className="bg-white/95 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Usuario o Correo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-sky-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 h-12 text-sm bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-200 focus:bg-white focus:ring-4 focus:ring-sky-50 transition-all text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="adminroos o adminroos@mao.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-sky-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2h12zm-3-12V7a5 5 0 10-10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 h-12 text-sm bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-200 focus:bg-white focus:ring-4 focus:ring-sky-50 transition-all text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-sky-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-shake">
                <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-rose-700 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-2xl font-bold tracking-wide text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:transform-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin rounded-full"></div>
              ) : (
                <>
                  Ingresar al Sistema
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER ENLACES LEGALES */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-400">
            <Link href="/politicas-privacidad" className="hover:text-slate-600 transition-colors">
              Privacidad
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <Link href="/terminos-condiciones" className="hover:text-slate-600 transition-colors">
              Términos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
