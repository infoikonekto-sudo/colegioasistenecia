'use client';

import { Empleado, Marcaje } from '@/types';
import { formatTime } from '@/lib/utils';

interface MarcajeConfirmacionProps {
  empleado: Empleado;
  marcaje: Marcaje;
  estado?: {
    estado: string;
    icon: string;
    color: string;
    minutosTarde?: number;
  };
  onComplete?: () => void;
}

export default function MarcajeConfirmacion({ 
  empleado, 
  marcaje, 
  estado = { estado: 'puntual', icon: 'check', color: 'emerald' },
  onComplete 
}: MarcajeConfirmacionProps) {
  const esPuntual = estado?.estado === 'puntual';

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">

      {/* Barra superior de color */}
      <div className={`h-1.5 w-full ${esPuntual ? 'bg-emerald-500' : 'bg-[#1E3A8A]'}`} />

      {/* Cuerpo centrado */}
      <div className="px-10 pt-10 pb-10 flex flex-col items-center text-center gap-5">

        {/* Avatar */}
        <div className="relative">
          {empleado.foto_url ? (
            <img
              src={empleado.foto_url}
              alt={`${empleado.nombre} ${empleado.apellido}`}
              className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-[#1E3A8A] flex items-center justify-center shadow-xl border-4 border-white">
              <span className="text-4xl font-black text-white tracking-tight select-none">
                {empleado.nombre[0]?.toUpperCase()}{empleado.apellido[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 ${esPuntual ? 'bg-emerald-500' : 'bg-[#1E3A8A]'} rounded-full flex items-center justify-center border-2 border-white shadow-md`}>
            {esPuntual ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Nombre y cargo */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {empleado.nombre} {empleado.apellido}
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {empleado.cargo || empleado.departamento || 'Personal'}
          </p>
          {empleado.departamento && empleado.cargo && (
            <span className="mt-2 inline-block px-3 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {empleado.departamento}
            </span>
          )}
        </div>

        {/* Hora grande */}
        <div className="text-5xl font-black text-[#1E3A8A] font-mono tracking-tight tabular-nums">
          {formatTime(marcaje.hora)}
        </div>

        {/* Mensaje de estado — limpio, sin detalles técnicos */}
        <div className={`px-6 py-3 rounded-full border-2 ${esPuntual
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
          <p className="text-sm font-bold uppercase tracking-widest">
            {esPuntual ? 'Asistencia Registrada' : 'Registro de Asistencia'}
          </p>
        </div>

        {/* Fecha */}
        <p className="text-[11px] text-slate-400 font-medium capitalize">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

      </div>
    </div>
  );
}
