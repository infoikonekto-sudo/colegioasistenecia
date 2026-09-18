'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { empleadosService } from '@/lib/supabase';
import SignatureCanvas from 'react-signature-canvas';
import { useCatalogos } from '@/hooks/useCatalogos';

interface ModalMovimientoProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrar: (movimiento: any, firmaBase64?: string) => Promise<void>;
  item: any;
  tipo: 'entrada' | 'salida';
}

export default function ModalMovimiento({ isOpen, onClose, onRegistrar, item, tipo }: ModalMovimientoProps) {
  const { departamentos: areasGlob } = useCatalogos();
  const [formData, setFormData] = useState({
    cantidad: 1,
    empleado_id: '',
    departamento: '',
    notas: ''
  });
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const sigCanvas = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (tipo === 'salida') {
        const loadEmpleados = async () => {
          const { data } = await empleadosService.getAll(item.sede);
          if (data) setEmpleados(data);
        };
        loadEmpleados();
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, tipo, item]);

  if (!isOpen || !item || !isMounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    
    let firmaBase64 = undefined;
    if (!isEntrada && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      firmaBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');
    }
    
    await onRegistrar({
      item_id: item.id,
      tipo,
      cantidad: Number(formData.cantidad),
      empleado_id: formData.empleado_id || null,
      departamento: formData.departamento || null,
      notas: formData.notas
    }, firmaBase64);
    
    setGuardando(false);
    setFormData({ cantidad: 1, empleado_id: '', departamento: '', notas: '' });
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const isEntrada = tipo === 'entrada';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col my-auto max-h-[85vh] overflow-hidden border border-slate-200">
          <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0 rounded-t-2xl ${isEntrada ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <h3 className={`font-bold ${isEntrada ? 'text-emerald-900' : 'text-rose-900'}`}>
            Registrar {isEntrada ? 'Entrada' : 'Salida'} de Ítem
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Ítem</p>
            <p className="font-bold text-slate-900">{item.nombre}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase">Stock Actual</p>
            <p className="font-bold text-slate-900">{item.stock_actual}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label htmlFor="mov-cantidad" className="text-xs font-bold text-slate-600 uppercase">Cantidad</label>
            <input
              id="mov-cantidad"
              type="number"
              min="1"
              max={!isEntrada ? item.stock_actual : undefined}
              required
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            />
          </div>

          {!isEntrada && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="mov-empleado" className="text-xs font-bold text-slate-600 uppercase">¿A quién se le cargará? (Opcional)</label>
                <select
                  id="mov-empleado"
                  value={formData.empleado_id}
                  onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                >
                  <option value="">Seleccione un empleado...</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mov-depto" className="text-xs font-bold text-slate-600 uppercase">Área / Departamento (Opcional)</label>
                <select
                  id="mov-depto"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                >
                  <option value="">Seleccione el área o departamento...</option>
                  {areasGlob.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex justify-between">
                  <span>Firma Digital (Obligatoria para salidas)</span>
                  <button 
                    type="button" 
                    onClick={() => sigCanvas.current?.clear()}
                    className="text-rose-500 hover:text-rose-700 underline text-[10px]"
                  >
                    Limpiar
                  </button>
                </label>
                <div className="border-2 border-dashed border-slate-300 bg-white rounded-lg overflow-hidden">
                  {isMounted && (
                    <SignatureCanvas 
                      ref={sigCanvas}
                      canvasProps={{
                        className: 'w-full h-32 cursor-crosshair'
                      }}
                    />
                  )}
                </div>
              </div>

            </>
          )}

          <div className="space-y-1.5">
            <label htmlFor="mov-notas" className="text-xs font-bold text-slate-600 uppercase">Notas (Opcional)</label>
            <textarea
              id="mov-notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 resize-none h-20"
              placeholder="Detalles del movimiento..."
            />
          </div>

          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={guardando || (!isEntrada && formData.cantidad > item.stock_actual)}
              className={`flex-1 h-11 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 ${isEntrada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {guardando ? 'GUARDANDO...' : `REGISTRAR ${isEntrada ? 'ENTRADA' : 'SALIDA'}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
