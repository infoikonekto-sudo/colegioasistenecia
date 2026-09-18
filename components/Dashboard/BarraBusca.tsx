'use client';

import { useState } from 'react';

interface BarraBuscaProps {
  onBuscar: (valor: string) => void;
  onExportar?: () => void;
  onFiltroFecha?: (fecha: string) => void;
  fechaActual?: string;
}

export default function BarraBusca({
  onBuscar,
  onExportar,
  onFiltroFecha,
  fechaActual,
}: BarraBuscaProps) {
  const [termino, setTermino] = useState('');

  const handleBuscar = (valor: string) => {
    setTermino(valor);
    onBuscar(valor);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Buscador */}
      <div className="flex-1">
        <div className="relative">
          <label htmlFor="busqueda" className="sr-only">
            Buscar empleado
          </label>
          <input
            id="busqueda"
            type="text"
            placeholder="🔍 Buscar empleado por nombre o cédula..."
            value={termino}
            onChange={(e) => handleBuscar(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Selector de fecha */}
      {onFiltroFecha && (
        <>
          <label htmlFor="fecha-filtro" className="sr-only">
            Filtrar por fecha
          </label>
          <input
            id="fecha-filtro"
            type="date"
            value={fechaActual || new Date().toISOString().split('T')[0]}
            onChange={(e) => onFiltroFecha(e.target.value)}
            className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </>
      )}

      {/* Botón Exportar */}
      {onExportar && (
        <button
          onClick={onExportar}
          className="px-6 py-3 bg-success text-white rounded-lg font-semibold hover:bg-success/90 transition flex items-center space-x-2"
        >
          <span>📊</span>
          <span>Exportar</span>
        </button>
      )}
    </div>
  );
}
