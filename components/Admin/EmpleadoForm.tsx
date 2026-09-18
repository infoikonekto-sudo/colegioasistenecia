'use client';

import { useState } from 'react';
import { empleadosService } from '@/lib/supabase';
import { Empleado } from '@/types';
import { useAsistenciaStore } from '@/lib/store';

import { generarCodigoQR } from '@/lib/qrCode';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface EmpleadoFormProps {
  empleado?: Empleado | null;
  onSuccess?: () => void;
}

export default function EmpleadoForm({ empleado, onSuccess }: EmpleadoFormProps) {
  const { adminSede } = useAsistenciaStore();
  const [formData, setFormData] = useState({
    nombre: empleado?.nombre || '',
    apellido: empleado?.apellido || '',
    cedula: empleado?.cedula || '',
    cargo: empleado?.cargo || '',
    departamento: empleado?.departamento || '',
    subarea: empleado?.subarea || '',
    email: empleado?.email || '',
    sede: empleado?.sede || adminSede || 'ROOS',
    activo: empleado ? empleado.activo : true,
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');

    try {
      if (!formData.nombre || !formData.cedula) throw new Error('Los campos con asterisco (*) son obligatorios.');

      if (empleado) {
        const updates = {
          ...formData,
          qr_code: empleado.qr_code || generarCodigoQR()
        };
        const { error } = await empleadosService.update(empleado.id, updates);
        if (error) throw new Error(error.message || 'Error al actualizar el funcionario.');
      } else {
        const { error } = await empleadosService.create({
          id: generateUUID(),
          ...formData,
          qr_code: generarCodigoQR(),
          activo: true,
          created_at: new Date().toISOString()
        });
        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('409')) {
            throw new Error(`La cédula/DPI "${formData.cedula}" ya está registrada para otro funcionario.`);
          }
          throw new Error(error.message || 'Error al crear el funcionario.');
        }
      }

      setExito(true);
      setTimeout(() => onSuccess?.(), 250);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="glass-card p-10 bg-white animate-fadeIn">
      <div className="mb-10 flex items-center justify-between border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{empleado ? 'Editar Expediente' : 'Nuevo Expediente de Personal'}</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Complete la información requerida para el registro oficial.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2h12zm-3-12V7a5 5 0 10-10 0v4" />
          </svg>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Servidor Seguro</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full"
              placeholder="Ej: Juan"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Apellido</label>
            <input
              type="text"
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              className="w-full"
              placeholder="Ej: Pérez"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Documento de Identidad *</label>
            <input
              type="text"
              value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              className="w-full font-mono text-sm tracking-widest"
              placeholder="000-000000-0000X"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Correo Electrónico</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full"
              placeholder="ejemplo@institucion.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Puesto / Cargo</label>
            <input
              type="text"
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              className="w-full"
              placeholder="Ej: Docente Titular"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Departamento / Área</label>
            <input
              type="text"
              value={formData.departamento}
              onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
              className="w-full"
              placeholder="Ej: Primaria"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Subárea</label>
            <input
              type="text"
              value={formData.subarea}
              onChange={(e) => setFormData({ ...formData, subarea: e.target.value })}
              className="w-full"
              placeholder="Ej: Segundo Grado"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Sede Universitaria</label>
            <select
              value={formData.sede}
              onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
              className="w-full bg-[#1E3A8A]/5 border-[#1E3A8A]/10 text-[#1E3A8A] font-bold h-11 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="ROOS">SEDE ROOS</option>
              <option value="CAES">SEDE CAES</option>
              <option value="AMBAS">AMBAS SEDES</option>
            </select>
          </div>
          
          {empleado && (
            <div className="space-y-1.5 md:col-span-2 mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Estado del Empleado</label>
              <p className="text-xs text-slate-500 mb-3">Si inactiva a un empleado, este no podrá marcar asistencia, pero su historial se mantendrá congelado en el sistema.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, activo: true })}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${formData.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                  ACTIVO
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, activo: false })}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${!formData.activo ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                  INACTIVO
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-error/5 border border-error/10 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold text-error">{error}</p>
          </div>
        )}

        {exito && (
          <div className="p-4 bg-success/5 border border-success/10 rounded-lg flex items-center gap-3 animate-fadeIn">
            <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold text-success">Información guardada correctamente.</p>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 btn-primary h-14 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {guardando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {empleado ? 'GUARDAR CAMBIOS' : 'REGISTRAR FUNCIONARIO'}
          </button>
        </div>
      </form>
    </div>
  );
}
