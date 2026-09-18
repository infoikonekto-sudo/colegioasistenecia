'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';

export const ESTACIONES_OPCIONES = [
  'Administración',
  'Preprimaria',
  'Secundaria',
  'Casita',
  'Primaria Elemental',
  'Primaria Superior',
  'Recepción'
];

interface ModalEstacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminSede?: string | null;
  estacionEditar?: any | null;
}

export default function ModalEstacionForm({
  isOpen,
  onClose,
  onSuccess,
  adminSede,
  estacionEditar
}: ModalEstacionFormProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sede, setSede] = useState<'CAES' | 'ROOS'>('ROOS');
  const [estacion, setEstacion] = useState('Recepción');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (estacionEditar) {
        setUsuario(estacionEditar.usuario || '');
        setPassword(estacionEditar.password || '');
        setSede(estacionEditar.sede === 'CAES' ? 'CAES' : 'ROOS');
        setEstacion(estacionEditar.estacion || 'Recepción');
      } else {
        setUsuario('');
        setPassword('');
        const defaultSede = adminSede && ['CAES', 'ROOS'].includes(adminSede.toUpperCase())
          ? (adminSede.toUpperCase() as 'CAES' | 'ROOS')
          : 'ROOS';
        setSede(defaultSede);
        setEstacion('Recepción');
      }
    }
  }, [isOpen, estacionEditar, adminSede]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!usuario.trim()) {
      setError('El usuario de la estación es obligatorio.');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('La contraseña de la estación es obligatoria.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        // Ignorar error al obtener sesión si no está autenticado vía Supabase Auth
      }

      const response = await fetch('/api/estaciones', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          id: estacionEditar?.id || undefined,
          usuario: usuario.trim().toLowerCase(),
          password: password.trim(),
          sede,
          estacion
        })
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Error (${response.status}) al guardar la estación.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('La solicitud tardó demasiado tiempo. Por favor intenta de nuevo.');
      } else {
        setError(err.message || 'Error de red o conexión al servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isSedeLocked = adminSede && ['CAES', 'ROOS'].includes(adminSede.toUpperCase());

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn space-y-6 my-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1E3A8A]/10 text-[#1E3A8A] rounded-2xl flex items-center justify-center font-bold text-xl">
              📱
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {estacionEditar ? 'Editar Estación de Marcaje' : 'Nueva Estación de Marcaje Kiosco'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Creación de usuario y asignación de punto de marcaje
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Sede */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Sede Asignada
            </label>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value as 'CAES' | 'ROOS')}
              disabled={!!isSedeLocked}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="ROOS">Sede ROOS</option>
              <option value="CAES">Sede CAES</option>
            </select>
            {isSedeLocked && (
              <p className="text-[10px] text-slate-400 font-medium italic">
                * Asignada automáticamente a tu sede de administrador ({adminSede}).
              </p>
            )}
          </div>

          {/* Estación / Punto de Marcaje */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Ubicación / Estación de Marcaje
            </label>
            <select
              value={estacion}
              onChange={(e) => setEstacion(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
              required
            >
              {ESTACIONES_OPCIONES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 font-medium">
              Esta ubicación aparecerá reflejada en los reportes y análisis de marcaje.
            </p>
          </div>

          {/* Usuario */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Usuario de Acceso
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ej. recepcion_caes o preprimaria_roos"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:font-normal placeholder:text-slate-400"
              required
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:font-normal placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {/* Botones Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {estacionEditar ? 'Guardar Cambios' : 'Crear Usuario de Estación'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
