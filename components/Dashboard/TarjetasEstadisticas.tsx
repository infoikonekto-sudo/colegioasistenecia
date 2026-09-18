'use client';

import { useMemo } from 'react';
import { Marcaje, Empleado } from '@/types';
import { calculateAsistenciaStats } from '@/lib/utils';

interface TarjetasEstadisticasProps {
  marcajes: Marcaje[];
  empleados: Empleado[];
  fecha: string;
}

export default function TarjetasEstadisticas({
  marcajes,
  empleados,
  fecha,
}: TarjetasEstadisticasProps) {
  const stats = useMemo(
    () => calculateAsistenciaStats(marcajes, empleados, fecha),
    [marcajes, empleados, fecha]
  );

  const tarjetas = [
    {
      titulo: 'Presentes',
      valor: stats.presentes,
      total: stats.totalEmpleados,
      icono: '✅',
      color: 'bg-success',
      porcentaje: Math.round((stats.presentes / stats.totalEmpleados) * 100),
    },
    {
      titulo: 'Retardos',
      valor: stats.retardos,
      total: stats.totalEmpleados,
      icono: '⚠️',
      color: 'bg-warning',
      porcentaje: Math.round((stats.retardos / stats.totalEmpleados) * 100),
    },
    {
      titulo: 'Ausentes',
      valor: stats.ausentes,
      total: stats.totalEmpleados,
      icono: '❌',
      color: 'bg-error',
      porcentaje: Math.round((stats.ausentes / stats.totalEmpleados) * 100),
    },
    {
      titulo: 'Total',
      valor: stats.totalEmpleados,
      total: stats.totalEmpleados,
      icono: '👥',
      color: 'bg-info',
      porcentaje: 100,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tarjetas.map((tarjeta, index) => (
        <div
          key={index}
          className={`rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">{tarjeta.icono}</span>
            <div
              className={`${tarjeta.color} text-white rounded-full p-3 text-2xl font-bold w-16 h-16 flex items-center justify-center`}
            >
              {tarjeta.valor}
            </div>
          </div>
          <h3 className="text-gray-600 font-semibold mb-1">{tarjeta.titulo}</h3>
          <p className="text-sm text-gray-500">
            {tarjeta.porcentaje}% del total ({tarjeta.total})
          </p>

          {/* Barra de progreso */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            {/* eslint-disable-next-line */}
            <div
              className={`progress-bar-fill ${tarjeta.color} h-full transition-all`}
              style={{ width: `${tarjeta.porcentaje}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
