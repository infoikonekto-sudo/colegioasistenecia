'use client';

import { useState } from 'react';

interface CrearDepartamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (departamento: { nombre: string }) => void;
}

export default function CrearDepartamentoModal({ isOpen, onClose, onCrear }: CrearDepartamentoModalProps) {
  const [nombre, setNombre] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-md p-8 bg-white shadow-2xl animate-fadeIn">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-900">Nuevo Departamento</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Departamento</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-12"
              placeholder="Ej: Contabilidad"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={() => { if (nombre) onCrear({ nombre }); setNombre(''); }}
              className="flex-1 btn-primary"
              disabled={!nombre}
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
