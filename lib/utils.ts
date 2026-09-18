import { Marcaje, Empleado } from '@/types';

export const calculateAsistenciaStats = (
  marcajes: Marcaje[],
  empleados: Empleado[],
  fecha: string
) => {
  const marcajesPorEmpleado: { [key: string]: Marcaje[] } = {};

  marcajes.forEach((marcaje) => {
    if (!marcajesPorEmpleado[marcaje.empleado_id]) {
      marcajesPorEmpleado[marcaje.empleado_id] = [];
    }
    marcajesPorEmpleado[marcaje.empleado_id].push(marcaje);
  });

  let presentes = 0;
  let retardos = 0;
  let ausentes = 0;

  empleados.forEach((empleado) => {
    const marcajeEmpleado = marcajesPorEmpleado[empleado.id];

    if (!marcajeEmpleado || marcajeEmpleado.length === 0) {
      ausentes++;
    } else {
      const entrada = marcajeEmpleado.find((m) => m.tipo === 'entrada');
      if (entrada) {
        const horaEntrada = new Date(`${fecha}T${entrada.hora}`);
        const horaLimite = new Date(`${fecha}T${empleado.horario_entrada}`);
        horaLimite.setMinutes(horaLimite.getMinutes() + empleado.tolerancia_minutos);

        if (horaEntrada <= horaLimite) {
          presentes++;
        } else {
          retardos++;
        }
      }
    }
  });

  const total = empleados.length;
  const porcentajeAsistencia = Math.round((presentes / total) * 100);

  return {
    fecha,
    totalEmpleados: total,
    presentes,
    retardos,
    ausentes,
    porcentajeAsistencia,
  };
};

export const getEstadoAsistencia = (marcaje: Marcaje | undefined, empleado: Empleado) => {
  if (!marcaje) {
    return { estado: 'ausente', icon: '❌', color: 'text-error' };
  }

  const entrada = new Date(`${marcaje.fecha}T${marcaje.hora}`);
  const horaLimite = new Date(`${marcaje.fecha}T${empleado.horario_entrada}`);
  horaLimite.setMinutes(horaLimite.getMinutes() + empleado.tolerancia_minutos);

  if (entrada <= horaLimite) {
    return { estado: 'puntual', icon: '✅', color: 'text-success' };
  } else {
    const minutosTarde = Math.floor(
      (entrada.getTime() - horaLimite.getTime()) / (1000 * 60)
    );
    return {
      estado: 'retardo',
      icon: '⚠️',
      color: 'text-warning',
      minutosTarde,
    };
  }
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return new Intl.DateTimeFormat('es-ES', options).format(d);
};

export const formatDateTime = (datetime: string): string => {
  const d = new Date(datetime);
  const options: Intl.DateTimeFormatOptions = {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat('es-ES', options).format(d);
};

export const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const exportToCSV = (data: any[], filename: string) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};
