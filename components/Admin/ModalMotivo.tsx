'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { justificacionesService } from '@/lib/supabase';

const MOTIVOS = [
  "Ausente por Enfermedad",
  "Ausente",
  "1 Cita Médico",
  "2 Cita IGSS",
  "3 Ingresó tarde",
  "4 Ingresará tarde",
  "5 Horario Especial",
  "6 Autorización para ausentarse",
  "7 Autorización para ingresar tarde",
  "8 Retirado (a)",
  "9 Suspensión IGSS",
  "10 Suspensión Médico",
  "11 No firmó",
  "12 En MAO C. S.",
  "13 En MAO Z.10",
  "14 Tráfico",
  "15 Capacitación",
  "16 Otros",
  "17 De baja",
  "18 Ingresó tarde al devocional",
  "19 Ingresó tarde a Carpool",
  "20 No ingresó al devocional",
  "21 Trabajo desde casa",
  "22 No marcó huella"
];

interface ModalMotivoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  empleado_id: string;
  fecha: string;
  nombreEmpleado: string;
  motivoActual: string;
  observacionesActual: string;
}

export default function ModalMotivo({ isOpen, onClose, onSaved, empleado_id, fecha, nombreEmpleado, motivoActual, observacionesActual }: ModalMotivoProps) {
  const [motivo, setMotivo] = useState(motivoActual || '');
  const [observaciones, setObservaciones] = useState(observacionesActual || '');
  const [guardando, setGuardando] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMotivo(motivoActual || '');
      setObservaciones(observacionesActual || '');
      
      const originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const mainSection = document.querySelector('section.flex-1.overflow-y-auto') as HTMLElement;
      let originalSectionOverflow = '';
      if (mainSection) {
        originalSectionOverflow = mainSection.style.overflow;
        mainSection.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        if (mainSection) {
          mainSection.style.overflow = originalSectionOverflow;
        }
      };
    }
  }, [isOpen, motivoActual, observacionesActual]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await justificacionesService.upsertDiario(empleado_id, fecha, motivo, observaciones);
      if (res.error) {
        console.error('Error al guardar justificación:', res.error);
        alert(`Error al guardar justificación: ${res.error.message || 'Intente de nuevo.'}`);
      } else {
        onSaved();
      }
    } catch (err: any) {
      console.error('Error inesperado al guardar justificación:', err);
      alert('Ocurrió un problema de red al guardar la justificación.');
    } finally {
      setGuardando(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[90vh]">
        <div className="px-5 py-3.5 border-b border-slate-700/40 flex justify-between items-center bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E3A8A] text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Justificar Motivo de Asistencia</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Funcionario</p>
            <p className="font-extrabold text-xs text-slate-900">{nombreEmpleado}</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#1E3A8A] bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs">
            {fecha}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Motivo de Asistencia</label>
            <select
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-gramm="false"
              data-enable-grammarly="false"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs h-10 px-3 rounded-xl font-medium focus:outline-none focus:border-[#1E3A8A]"
            >
              <option value="">Seleccione un motivo...</option>
              {MOTIVOS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Observaciones (Opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              data-gramm="false"
              data-enable-grammarly="false"
              spellCheck={false}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none focus:border-[#1E3A8A] resize-none h-20 font-medium"
              placeholder="Detalles adicionales o justificación de RRHH..."
            />
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 h-10 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50 uppercase tracking-wider"
            >
              {guardando ? 'Guardando...' : 'Guardar Motivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
