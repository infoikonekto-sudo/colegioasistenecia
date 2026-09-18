'use client';

import { useEffect, useState } from 'react';
import { Marcaje, Empleado } from '@/types';
import { getEstadoAsistencia, formatTime } from '@/lib/utils';

interface ListaAsistenciaProps {
  marcajes: Marcaje[];
  empleados: Empleado[];
  filtro?: string;
}

export default function ListaAsistencia({
  marcajes,
  empleados,
  filtro = '',
}: ListaAsistenciaProps) {
  const [marcajesFiltrados, setMarcajesFiltrados] = useState<Marcaje[]>([]);

  useEffect(() => {
    let filtered = marcajes;

    if (filtro) {
      filtered = marcajes.filter((marcaje) => {
        const empleado = empleados.find((e) => e.id === marcaje.empleado_id);
        if (!empleado) return false;
        const nombreCompleto = `${empleado.nombre} ${empleado.apellido}`.toLowerCase();
        const cedula = empleado.cedula.toLowerCase();
        return nombreCompleto.includes(filtro.toLowerCase()) || cedula.includes(filtro);
      });
    }

    setMarcajesFiltrados(filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }, [marcajes, filtro, empleados]);

  if (marcajesFiltrados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {filtro ? 'No se encontraron resultados' : 'No hay marcajes registrados'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {marcajesFiltrados.map((marcaje) => {
        const empleado = empleados.find((e) => e.id === marcaje.empleado_id);
        if (!empleado) return null;

        const estado = getEstadoAsistencia(marcaje, empleado);

        return (
          <div
            key={marcaje.id}
            className={`p-4 rounded-lg border-l-4 transition-all ${
              estado.estado === 'puntual'
                ? 'bg-success/5 border-success hover:bg-success/10'
                : estado.estado === 'retardo'
                  ? 'bg-warning/5 border-warning hover:bg-warning/10'
                  : 'bg-error/5 border-error hover:bg-error/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {empleado.foto_url && (
                  <img
                    src={empleado.foto_url}
                    alt={`${empleado.nombre} ${empleado.apellido}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {empleado.nombre} {empleado.apellido}
                  </p>
                  <p className="text-sm text-gray-600">{empleado.cargo}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-lg">
                  {estado.icon} {formatTime(marcaje.hora)}
                </p>
                <p className="text-sm text-gray-600">📍 {marcaje.punto_marcaje}</p>
                {estado.estado === 'retardo' && (
                  <p className="text-sm font-semibold text-warning">
                    {estado.minutosTarde} min de retardo
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
