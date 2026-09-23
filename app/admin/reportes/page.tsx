'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { marcajesService, empleadosService, justificacionesService, configuracionService } from '@/lib/supabase';
import { useAsistenciaStore } from '@/lib/store';
import ModalMotivo from '@/components/Admin/ModalMotivo';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { exportToExcel } from '@/lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface MarcajeRow {
  id: string;
  empleado_id: string;
  fecha: string;
  hora: string;
  tipo?: 'entrada' | 'salida';
  punto_marcaje: string;
  confianza: number;
  foto_marcaje_url?: string;
  foto_url?: string;
  empleado?: {
    id: string;
    nombre: string;
    apellido: string;
    departamento: string;
    subarea?: string;
    cargo: string;
    cedula: string;
  };
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  departamento: string;
  subarea?: string;
  cargo: string;
  cedula: string;
  face_descriptor?: any;
}

interface AsuetoRegla {
  id: string;
  inicio: string;
  fin: string;
  departamentos: string[];
}

interface Config {
  horaEntrada: string;
  toleranciaMinutos: number;
  horaSalida: string;
  asuetos: AsuetoRegla[];
  finesDeSemanaLaborables: string[];
}

const DEFAULT_CONFIG: Config = { horaEntrada: '07:30', toleranciaMinutos: 10, horaSalida: '16:00', asuetos: [], finesDeSemanaLaborables: [] };

async function fetchConfig(): Promise<Config> {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const { data } = await configuracionService.get('horario_rrhh');
    if (data && data.valor) {
      const parsed = data.valor;
      if (!parsed.asuetos) parsed.asuetos = [];
      if (!parsed.finesDeSemanaLaborables) parsed.finesDeSemanaLaborables = [];
      return parsed as Config;
    }
  } catch (e) {
    console.warn('No se pudo cargar config de la nube', e);
  }
  const s = localStorage.getItem('rrhh_horario_config');
  if (!s) return DEFAULT_CONFIG;
  const parsed = JSON.parse(s);
  if (!parsed.asuetos) parsed.asuetos = [];
  if (!parsed.finesDeSemanaLaborables) parsed.finesDeSemanaLaborables = [];
  return parsed;
}

function toMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minDiff(hora: string, ref: string): number {
  return toMinutes(hora.substring(0, 5)) - toMinutes(ref);
}

function getTodayStr() {
  const date = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Guatemala"}));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDiaNoLaboral(fechaStr: string, asuetos: AsuetoRegla[] = [], deptoEmpleado: string = '', finesDeSemanaLaborables: string[] = []): { isNoLaboral: boolean, tipo: 'fin_de_semana' | 'asueto' | null } {
  const parts = fechaStr.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const day = date.getDay();
  
  if ((day === 0 || day === 6) && !finesDeSemanaLaborables.includes(fechaStr)) {
    return { isNoLaboral: true, tipo: 'fin_de_semana' };
  }
  
  for (const regla of asuetos) {
    if (fechaStr >= regla.inicio && fechaStr <= regla.fin) {
      if (regla.departamentos.includes('Todos') || regla.departamentos.includes(deptoEmpleado)) {
        return { isNoLaboral: true, tipo: 'asueto' };
      }
    }
  }
  return { isNoLaboral: false, tipo: null };
}

function getLimite(cfg: Config) {
  const [h, m] = cfg.horaEntrada.split(':').map(Number);
  const total = h * 60 + m + cfg.toleranciaMinutos;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Export Utilities ────────────────────────────────────────────────────────

async function exportarPDF(columnas: string[], filas: string[][], titulo: string, sede: string | null = null, subtituloExtra?: string) {
  const orientation = columnas.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation });
  
  // Header Navy Premium (32px de alto para espacio suficiente de textos)
  const headerHeight = subtituloExtra ? 32 : 26;
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, doc.internal.pageSize.width, headerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const tituloCompleto = sede ? `Colegio Manos a la Obra - SEDE ${sede}` : 'Colegio Manos a la Obra';
  doc.text(tituloCompleto, 14, 11);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`${titulo} | Generado: ${new Date().toLocaleString('es-ES')}`, 14, 18);
  
  if (subtituloExtra) {
     doc.setFont('helvetica', 'bold');
     doc.setTextColor(191, 219, 254); // Azul cyan claro para alto contraste en la franja
     doc.text(`Análisis IA: ${subtituloExtra}`, 14, 25);
  }
  
  const currentY = headerHeight + 8;
  
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: currentY,
    styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  
  const nombreFinal = sede ? `${titulo.replace(/\s+/g, '-').toLowerCase()}-sede-${sede.toLowerCase()}` : titulo.replace(/\s+/g, '-').toLowerCase();
  doc.save(`${nombreFinal}-${getTodayStr()}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { adminSede } = useAsistenciaStore();
  const [activeTab, setActiveTab] = useState<'resumen' | 'asistencia' | 'ia' | 'config'>('resumen');
  
  // Data States
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [marcajes, setMarcajes] = useState<MarcajeRow[]>([]);
  const [justificaciones, setJustificaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [configEdit, setConfigEdit] = useState<Config>(DEFAULT_CONFIG);
  const [configGuardado, setConfigGuardado] = useState(false);
  const [exportando, setExportando] = useState(false);
  
  // IA Selection
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<string>('');

  // Modal Justificación
  const [modalMotivo, setModalMotivo] = useState({ isOpen: false, empleado_id: '', fecha: '', nombreEmpleado: '', motivoActual: '', observacionesActual: '' });

  // Modal Foto Evidencia Silenciosa
  const [modalFotoEvidencia, setModalFotoEvidencia] = useState<{ isOpen: boolean; url: string; nombre: string; fechaHora: string }>({
    isOpen: false,
    url: '',
    nombre: '',
    fechaHora: ''
  });

  // Filters
  const [fechaInicio, setFechaInicio] = useState(getTodayStr());
  const [fechaFin, setFechaFin] = useState(getTodayStr());
  const [busqueda, setBusqueda] = useState('');
  const [busquedaIA, setBusquedaIA] = useState('');
  const [filtroDept, setFiltroDept] = useState('');
  const [filtroEstacion, setFiltroEstacion] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'puntual' | 'tarde' | 'ausente'>('Todos');
  const filtroSede = adminSede;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchConfig().then(c => {
      setConfig(c);
      setConfigEdit(c);
    });
  }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const [{ data: emps }, { data: marcs }, { data: justifs }] = await Promise.all([
        empleadosService.getAll(filtroSede || undefined),
        marcajesService.getByRango(fechaInicio, fechaFin, filtroSede || undefined),
        justificacionesService.getByRango(fechaInicio, fechaFin)
      ]);
      setEmpleados(emps || []);
      setMarcajes(marcs || []);
      setJustificaciones(justifs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [fechaInicio, fechaFin, filtroSede]);

  useEffect(() => {
    if (modalFotoEvidencia.isOpen || modalMotivo.isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modalFotoEvidencia.isOpen, modalMotivo.isOpen]);

  // Options for filters
  const departamentos = useMemo(() => [...new Set(empleados.map(e => e.departamento).filter(Boolean))].sort(), [empleados]);
  const estaciones = useMemo(() => [...new Set(marcajes.map(m => m.punto_marcaje).filter(Boolean))].sort(), [marcajes]);

  // Quick Preset Date Helpers
  const setPresetHoy = () => {
    const today = getTodayStr();
    setFechaInicio(today);
    setFechaFin(today);
  };

  const setPresetEstaSemana = () => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1;
    const firstday = new Date(curr.setDate(first)).toISOString().slice(0, 10);
    const today = getTodayStr();
    setFechaInicio(firstday);
    setFechaFin(today);
  };

  const setPresetEsteMes = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
    const today = getTodayStr();
    setFechaInicio(firstDay);
    setFechaFin(today);
  };

  // Base Data Computations
  const totalEmpleados = empleados.length;
  const enrolados = empleados.filter(e => e.face_descriptor && Array.isArray(e.face_descriptor) && e.face_descriptor.length > 0).length;
  const porcentajeEnrol = totalEmpleados ? Math.round((enrolados / totalEmpleados) * 100) : 0;

  const esDiaUnico = fechaInicio === fechaFin;

  type RowAsistencia = {
    empleadoId: string;
    nombre: string;
    apellido: string;
    cedula: string;
    departamento: string;
    subarea: string;
    cargo: string;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    estacion: string;
    minutos: number;
    status: 'puntual' | 'tarde' | 'ausente' | 'asueto' | 'fin_de_semana';
    motivo: string;
    observaciones: string;
    fotoEvidenciaUrl?: string;
    fotoEvidenciaSalidaUrl?: string;
  };

  const tablaAsistencia: RowAsistencia[] = useMemo(() => {
    if (esDiaUnico) {
      return empleados.map(emp => {
        const empMarcs = marcajes.filter(x => x.empleado_id === emp.id && x.fecha === fechaInicio);
        
        const entradas = empMarcs.filter(m => m.tipo === 'entrada').sort((a, b) => a.hora.localeCompare(b.hora));
        const salidas = empMarcs.filter(m => m.tipo === 'salida').sort((a, b) => b.hora.localeCompare(a.hora));
        
        const mEntrada = entradas[0] || empMarcs.sort((a, b) => a.hora.localeCompare(b.hora))[0];
        let mSalida = salidas[0];

        // Fallback: Si escaneó 2+ veces en el día y no hay marcaje marcado explícitamente como 'salida'
        if (!mSalida && empMarcs.length > 1) {
          const sortedDesc = [...empMarcs].sort((a, b) => b.hora.localeCompare(a.hora));
          if (sortedDesc[0] !== mEntrada) {
            mSalida = sortedDesc[0];
          }
        }
        
        const horaEntrada = mEntrada?.hora?.substring(0, 5) || '-';
        const horaSalida = mSalida?.hora?.substring(0, 5) || '-';
        
        const diff = mEntrada ? minDiff(mEntrada.hora, config.horaEntrada) : Infinity;
        const noLaboral = isDiaNoLaboral(fechaInicio, config.asuetos, emp.cargo || '', config.finesDeSemanaLaborables);
        
        let status: 'puntual' | 'tarde' | 'ausente' | 'asueto' | 'fin_de_semana';
        if (!mEntrada && !mSalida) {
          if (noLaboral.isNoLaboral) status = noLaboral.tipo as 'asueto' | 'fin_de_semana';
          else status = 'ausente';
        } else if (mEntrada) {
          status = diff <= config.toleranciaMinutos ? 'puntual' : 'tarde';
        } else {
          status = 'puntual';
        }
        
        const justif = justificaciones.find(j => j.empleado_id === emp.id && j.fecha === fechaInicio);
        const estacion = mEntrada?.punto_marcaje || mSalida?.punto_marcaje || '—';
        const fotoEntrada = (mEntrada as any)?.foto_marcaje_url || (mEntrada as any)?.foto_url || '';
        const fotoSalida = (mSalida as any)?.foto_marcaje_url || (mSalida as any)?.foto_url || '';

        return {
          empleadoId: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          cedula: emp.cedula,
          departamento: emp.departamento || '—',
          subarea: emp.subarea || '—',
          cargo: emp.cargo || '—',
          fecha: fechaInicio,
          horaEntrada,
          horaSalida,
          estacion,
          minutos: diff,
          status,
          motivo: justif?.motivo || '',
          observaciones: justif?.observaciones || '',
          fotoEvidenciaUrl: fotoEntrada,
          fotoEvidenciaSalidaUrl: fotoSalida
        };
      });
    }

    const grouped = new Map<string, MarcajeRow[]>();
    marcajes.forEach(m => {
      const key = `${m.empleado_id}_${m.fecha}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    });

    const rows: RowAsistencia[] = [];
    grouped.forEach((list) => {
      const firstM = list[0];
      const emp = firstM.empleado || empleados.find(e => e.id === firstM.empleado_id);
      
      const entradas = list.filter(m => m.tipo === 'entrada').sort((a, b) => a.hora.localeCompare(b.hora));
      const salidas = list.filter(m => m.tipo === 'salida').sort((a, b) => b.hora.localeCompare(a.hora));

      const mEntrada = entradas[0] || [...list].sort((a, b) => a.hora.localeCompare(b.hora))[0];
      let mSalida = salidas[0];

      // Fallback para registros grupales
      if (!mSalida && list.length > 1) {
        const sortedDesc = [...list].sort((a, b) => b.hora.localeCompare(a.hora));
        if (sortedDesc[0] !== mEntrada) {
          mSalida = sortedDesc[0];
        }
      }

      const horaEntrada = mEntrada?.hora?.substring(0, 5) || '-';
      const horaSalida = mSalida?.hora?.substring(0, 5) || '-';

      const diff = mEntrada ? minDiff(mEntrada.hora, config.horaEntrada) : (mSalida ? minDiff(mSalida.hora, config.horaEntrada) : 0);
      const justif = justificaciones.find(j => j.empleado_id === firstM.empleado_id && j.fecha === firstM.fecha);
      const estacion = mEntrada?.punto_marcaje || mSalida?.punto_marcaje || firstM.punto_marcaje || '—';

      const fotoEntrada = (mEntrada as any)?.foto_marcaje_url || (mEntrada as any)?.foto_url || '';
      const fotoSalida = (mSalida as any)?.foto_marcaje_url || (mSalida as any)?.foto_url || '';

      rows.push({
        empleadoId: firstM.empleado_id,
        nombre: emp?.nombre || 'N/A',
        apellido: emp?.apellido || '',
        cedula: emp?.cedula || '',
        departamento: emp?.departamento || '—',
        subarea: emp?.subarea || '—',
        cargo: emp?.cargo || '—',
        fecha: firstM.fecha,
        horaEntrada,
        horaSalida,
        estacion,
        minutos: diff,
        status: diff <= config.toleranciaMinutos ? 'puntual' : 'tarde',
        motivo: justif?.motivo || '',
        observaciones: justif?.observaciones || '',
        fotoEvidenciaUrl: fotoEntrada,
        fotoEvidenciaSalidaUrl: fotoSalida
      });
    });

    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre));
  }, [empleados, marcajes, esDiaUnico, fechaInicio, config, justificaciones]);

  const tablaFiltrada = useMemo(() => tablaAsistencia.filter(r => {
    const nombreCompleto = `${r.nombre} ${r.apellido}`.toLowerCase();
    const matchesStatus = filtroStatus === 'Todos' || r.status === filtroStatus;
    return (
      (!busqueda || nombreCompleto.includes(busqueda.toLowerCase()) || r.cedula.includes(busqueda)) &&
      (!filtroDept || r.departamento === filtroDept) &&
      (!filtroEstacion || r.estacion === filtroEstacion) &&
      matchesStatus
    );
  }), [tablaAsistencia, busqueda, filtroDept, filtroEstacion, filtroStatus]);

  // Aggregate Metrics for Tab 1
  const puntualesCount = tablaAsistencia.filter(r => r.status === 'puntual').length;
  const tardanzasCount = tablaAsistencia.filter(r => r.status === 'tarde').length;
  const ausentesCount = tablaAsistencia.filter(r => r.status === 'ausente').length;
  const totalMarcajes = tablaAsistencia.length;

  const pctPuntual = totalMarcajes ? Math.round((puntualesCount / totalMarcajes) * 100) : 0;
  const totalMinutosRetraso = tablaAsistencia.reduce((acc, r) => acc + (r.status === 'tarde' && r.minutos > config.toleranciaMinutos ? r.minutos : 0), 0);

  // Grouped Data for Recharts Trend
  const trendData = useMemo(() => {
    const map: Record<string, { fecha: string; puntuales: number; tardanzas: number }> = {};
    tablaAsistencia.forEach(r => {
      if (!map[r.fecha]) map[r.fecha] = { fecha: r.fecha.substring(5), puntuales: 0, tardanzas: 0 };
      if (r.status === 'puntual') map[r.fecha].puntuales++;
      if (r.status === 'tarde') map[r.fecha].tardanzas++;
    });
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [tablaAsistencia]);

  // Individual IA Performance Metrics
  const rendimientoEmpleado = useMemo(() => {
    if (!empleadoSeleccionadoId) return null;
    const emp = empleados.find(e => e.id === empleadoSeleccionadoId);
    if (!emp) return null;

    const datosEmpleado = tablaAsistencia.filter(r => r.cedula === emp.cedula);
    if (datosEmpleado.length === 0) return { emp, datosEmpleado: [], totalDias: 0, porcentajePuntualidad: 0, aiInsight: 'Sin registros de marcaje en el rango seleccionado.', aiColor: 'slate', chartData: [] };

    const totalDias = datosEmpleado.length;
    const diasAusente = datosEmpleado.filter(d => d.status === 'ausente').length;
    const diasPresente = totalDias - diasAusente;
    const diasPuntual = datosEmpleado.filter(d => d.status === 'puntual').length;
    const diasTarde = datosEmpleado.filter(d => d.status === 'tarde').length;
    
    const porcentajePuntualidad = diasPresente > 0 ? Math.round((diasPuntual / diasPresente) * 100) : 0;
    const minutosRetrasoTotal = datosEmpleado.reduce((sum, d) => sum + (d.status === 'tarde' && d.minutos > config.toleranciaMinutos ? d.minutos : 0), 0);
    
    let aiInsight = '';
    let aiColor = 'emerald';
    
    if (diasPresente === 0) {
      aiInsight = 'No se registran asistencias para este funcionario en el período. Se sugiere verificar el motivo de ausencia.';
      aiColor = 'slate';
    } else if (porcentajePuntualidad >= 95) {
      aiInsight = 'Rendimiento Sobresaliente. Mantiene un cumplimiento de horario ejemplar (arriba del 95%).';
      aiColor = 'emerald';
    } else if (porcentajePuntualidad >= 80) {
      aiInsight = `Cumplimiento Normal. Presentó ${diasTarde} tardanza(s), acumulando ${minutosRetrasoTotal} minutos de retardo en total.`;
      aiColor = 'blue';
    } else if (porcentajePuntualidad >= 50) {
      aiInsight = `Atención Requerida. Índice de puntualidad al ${porcentajePuntualidad}%. Registra ${minutosRetrasoTotal} min acumulados. Se sugiere reunión de seguimiento.`;
      aiColor = 'amber';
    } else {
      aiInsight = `Alerta Crítica de Asistencia. El ${100 - porcentajePuntualidad}% de sus marcajes han sido con retardo. Acción administrativa prioritaria.`;
      aiColor = 'rose';
    }

    const chartData = datosEmpleado.map(d => ({
      fecha: d.fecha.substring(5),
      minutos: d.minutos === Infinity ? 0 : d.minutos,
      horaEntrada: d.horaEntrada,
      horaSalida: d.horaSalida,
      status: d.status
    }));

    return {
      emp,
      datosEmpleado,
      totalDias,
      diasPresente,
      diasAusente,
      diasPuntual,
      diasTarde,
      porcentajePuntualidad,
      minutosRetrasoTotal,
      aiInsight,
      aiColor,
      chartData
    };
  }, [empleadoSeleccionadoId, tablaAsistencia, empleados, config]);

  // Handlers
  const handleGuardarConfig = async () => {
    try {
      await configuracionService.set('horario_rrhh', configEdit);
      localStorage.setItem('rrhh_horario_config', JSON.stringify(configEdit));
      setConfig(configEdit);
      setConfigGuardado(true);
      setTimeout(() => setConfigGuardado(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportarExcel = () => {
    setExportando(true);
    const rows = tablaFiltrada.map(r => ({
      'Departamento': r.departamento,
      'Nombre': `${r.nombre} ${r.apellido}`,
      'Motivo': r.motivo || 'Sin Justificación',
      'Observación': r.observaciones || '-',
      'Hora Entrada': r.horaEntrada,
      'Hora Salida': r.horaSalida,
      'Estación': r.estacion,
      'Fecha': r.fecha,
      'Estado': r.status.toUpperCase()
    }));
    const nombreFinal = adminSede ? `reporte-asistencia-sede-${adminSede.toLowerCase()}` : 'reporte-asistencia';
    exportToExcel(rows, `${nombreFinal}-${getTodayStr()}`);
    setExportando(false);
  };

  const handleExportarPDF = () => {
    setExportando(true);
    const cols = ['Departamento', 'Nombre', 'Motivo', 'Observación', 'Hora Entrada', 'Hora Salida', 'Estación', 'Fecha', 'Estado'];
    const rows = tablaFiltrada.map(r => [
      r.departamento,
      `${r.nombre} ${r.apellido}`,
      r.motivo || '-',
      r.observaciones || '-',
      r.horaEntrada,
      r.horaSalida,
      r.estacion,
      r.fecha,
      r.status.toUpperCase()
    ]);
    exportarPDF(cols, rows, 'Informe de Asistencia e Ingreso/Salida Institucional', adminSede, `Rango: ${fechaInicio} a ${fechaFin}`);
    setExportando(false);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn pb-8">

      {/* HEADER PRINCIPAL COMPACTO DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel px-5 py-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#1E3A8A] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight">
              Centro de Control & Analítica {adminSede ? `• Sede ${adminSede}` : ''}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Control ergonómico de puntualidad, asistencias y expedientes biométricos.
            </p>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS DE FECHA & RANGO */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={setPresetHoy}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${fechaInicio === getTodayStr() && fechaFin === getTodayStr() ? 'bg-white text-[#1E3A8A] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Hoy
          </button>
          <button
            onClick={setPresetEstaSemana}
            className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
          >
            Esta Semana
          </button>
          <button
            onClick={setPresetEsteMes}
            className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
          >
            Este Mes
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN INTUITIVA (4 PESTAÑAS PRINCIPALES) */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-xs tracking-wider uppercase transition-all border-b-2 ${activeTab === 'resumen' ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          1. Resumen Ejecutivo
        </button>

        <button
          onClick={() => setActiveTab('asistencia')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-xs tracking-wider uppercase transition-all border-b-2 ${activeTab === 'asistencia' ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          2. Explorador de Asistencias
        </button>

        <button
          onClick={() => setActiveTab('ia')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-xs tracking-wider uppercase transition-all border-b-2 ${activeTab === 'ia' ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          3. Diagnóstico IA Funcionario
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-xs tracking-wider uppercase transition-all border-b-2 ${activeTab === 'config' ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Reglas & Horarios
        </button>
      </div>

      {/* BARRA DE RANGO Y FILTROS RÁPIDOS */}
      <div className="glass-panel p-4 rounded-2xl bg-white border border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Filtrar Departamento</label>
          <select
            value={filtroDept}
            onChange={e => setFiltroDept(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
          >
            <option value="">Todos los Departamentos</option>
            {departamentos.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-4 md:pt-0">
          <button
            onClick={handleExportarExcel}
            disabled={exportando}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            className="flex-1 bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 1: RESUMEN EJECUTIVO (KPIs & TENDENCIA) */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI CARDS EN GRIDA INTUITIVA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-6 rounded-3xl bg-white border-l-4 border-l-emerald-500 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Puntualidad Global</span>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                  {pctPuntual}% Cumplimiento
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{puntualesCount} Marcajes</p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctPuntual}%` }}></div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-white border-l-4 border-l-amber-500 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tardanzas Registradas</span>
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">
                  {tardanzasCount} Incidentes
                </span>
              </div>
              <p className="text-3xl font-extrabold text-amber-900 tracking-tight">{totalMinutosRetraso} Min</p>
              <p className="text-[11px] font-medium text-slate-400 mt-2">Retardo operativo acumulado</p>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-white border-l-4 border-l-rose-500 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inasistencias</span>
                <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold">
                  Sin registro
                </span>
              </div>
              <p className="text-3xl font-extrabold text-rose-900 tracking-tight">{ausentesCount} Inasistencias</p>
              <p className="text-[11px] font-medium text-slate-400 mt-2">En el período consultado</p>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-white border-l-4 border-l-blue-600 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cobertura Biométrico</span>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">
                  {porcentajeEnrol}% Enrolado
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{enrolados} / {totalEmpleados}</p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${porcentajeEnrol}%` }}></div>
              </div>
            </div>
          </div>

          {/* GRÁFICO RECHARTS DE TENDENCIA */}
          <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Tendencia de Asistencia y Puntualidad</h3>
                <p className="text-xs text-slate-400">Evolución día por día de marcajes puntuales vs tardanzas en el rango de fechas.</p>
              </div>
            </div>

            <div className="w-full pt-4 h-[280px] min-h-[280px]">
              {isMounted && (
                <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="fecha" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#FFF', border: 'none' }} />
                    <Line type="monotone" dataKey="puntuales" stroke="#059669" strokeWidth={3} name="Puntuales" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="tardanzas" stroke="#D97706" strokeWidth={3} name="Tardanzas" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 2: EXPLORADOR DE ASISTENCIAS (TABLA CON FILTROS E INCIDENTES) */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'asistencia' && (
        <div className="space-y-4 animate-fadeIn">
          {/* BARRA DE BÚSQUEDA Y FILTRO RÁPIDO DE ESTADO */}
          <div className="glass-panel p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre de funcionario o cédula..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">Estado:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                {(['Todos', 'puntual', 'tarde', 'ausente'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFiltroStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filtroStatus === st ? 'bg-white text-[#1E3A8A] shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE REGISTROS */}
          <div className="glass-panel rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 pl-5">Departamento</th>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">Motivo</th>
                    <th className="py-2.5 px-3">Observación</th>
                    <th className="py-2.5 px-3 text-emerald-400">Hora Entrada</th>
                    <th className="py-2.5 px-3 text-blue-400">Hora Salida</th>
                    <th className="py-2.5 px-3">Estación</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cargando ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                        Cargando registros de asistencia...
                      </td>
                    </tr>
                  ) : tablaFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    tablaFiltrada.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 pl-5 font-medium text-slate-600">{row.departamento}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div>
                            <span>{row.nombre} {row.apellido}</span>
                            <span className="block text-[10px] font-mono font-normal text-slate-400">{row.cedula}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">
                          {row.motivo ? (
                            <span className="inline-block text-blue-900 font-semibold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 text-[11px]">
                              {row.motivo}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium max-w-xs">
                          {row.observaciones ? (
                            <span className="text-[11px] text-slate-600 font-normal leading-tight italic truncate max-w-[200px] block" title={row.observaciones}>
                              {row.observaciones}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{row.horaEntrada}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{row.horaSalida}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-500">{row.estacion}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{row.fecha}</td>
                        <td className="py-2.5 px-3">
                          {row.status === 'puntual' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Puntual
                            </span>
                          )}
                          {row.status === 'tarde' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Tarde ({row.minutos > 0 ? `+${row.minutos}m` : ''})
                            </span>
                          )}
                          {row.status === 'ausente' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Ausente
                            </span>
                          )}
                          {row.status === 'asueto' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] uppercase">
                              Asueto
                            </span>
                          )}
                          {row.status === 'fin_de_semana' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                              Fin de semana
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.fotoEvidenciaUrl && (
                              <button
                                onClick={() => setModalFotoEvidencia({
                                  isOpen: true,
                                  url: row.fotoEvidenciaUrl || '',
                                  nombre: `${row.nombre} ${row.apellido}`,
                                  fechaHora: `${row.fecha} (Entrada: ${row.horaEntrada})`
                                })}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-700 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 border border-emerald-200/60"
                                title="Ver fotografía de entrada"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Entrada
                              </button>
                            )}
                            {row.fotoEvidenciaSalidaUrl && (
                              <button
                                onClick={() => setModalFotoEvidencia({
                                  isOpen: true,
                                  url: row.fotoEvidenciaSalidaUrl || '',
                                  nombre: `${row.nombre} ${row.apellido}`,
                                  fechaHora: `${row.fecha} (Salida: ${row.horaSalida})`
                                })}
                                className="px-2 py-1 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 border border-blue-200/60"
                                title="Ver fotografía de salida"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Salida
                              </button>
                            )}
                            <button
                              onClick={() => setModalMotivo({
                                isOpen: true,
                                empleado_id: row.empleadoId,
                                fecha: row.fecha,
                                nombreEmpleado: `${row.nombre} ${row.apellido}`,
                                motivoActual: row.motivo,
                                observacionesActual: row.observaciones
                              })}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#1E3A8A] hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                            >
                              Justificar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 3: DIAGNÓSTICO IA POR FUNCIONARIO */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ia' && (
        <div className="space-y-6 animate-fadeIn">
          {/* SELECTOR DE FUNCIONARIO */}
          <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seleccionar Funcionario para Análisis Diagnóstico</h3>
            
            <div className="relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={busquedaIA}
                onChange={e => setBusquedaIA(e.target.value)}
                placeholder="Buscar funcionario por nombre o cédula..."
                className="w-full pl-10 pr-4 py-2.5 mb-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <select
              value={empleadoSeleccionadoId}
              onChange={e => setEmpleadoSeleccionadoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#1E3A8A]"
            >
              <option value="">-- Seleccione un funcionario de la lista --</option>
              {empleados
                .filter(e => {
                  if (!busquedaIA) return true;
                  const searchStr = `${e.nombre} ${e.apellido} ${e.cedula}`.toLowerCase();
                  return searchStr.includes(busquedaIA.toLowerCase());
                })
                .map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre} {e.apellido} - {e.cargo || e.departamento} (Cédula: {e.cedula})
                </option>
              ))}
            </select>
          </div>

          {rendimientoEmpleado ? (
            <div className="space-y-6">
              {/* TARJETA RESULTADO DIAGNÓSTICO IA */}
              <div className={`glass-panel p-8 rounded-3xl border-l-8 bg-white shadow-sm ${rendimientoEmpleado.aiColor === 'emerald' ? 'border-l-emerald-500' : rendimientoEmpleado.aiColor === 'blue' ? 'border-l-blue-600' : rendimientoEmpleado.aiColor === 'amber' ? 'border-l-amber-500' : 'border-l-rose-500'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnóstico Institucional</span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {rendimientoEmpleado.emp.nombre} {rendimientoEmpleado.emp.apellido}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      {rendimientoEmpleado.emp.cargo} • {rendimientoEmpleado.emp.departamento}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-slate-900">{rendimientoEmpleado.porcentajePuntualidad}%</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumplimiento Puntualidad</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Dictamen del Sistema:
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {rendimientoEmpleado.aiInsight}
                  </p>
                </div>
              </div>

              {/* GRÁFICO INDIVIDUAL RECHARTS */}
              <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Variación de Minutos de Llegada</h3>
                <div className="h-64 w-full pt-2 min-h-[250px]">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                      <LineChart data={rendimientoEmpleado.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="fecha" stroke="#94A3B8" fontSize={11} />
                        <YAxis stroke="#94A3B8" fontSize={11} label={{ value: 'Minutos vs Entrada', angle: -90, position: 'insideLeft' }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#FFF' }} />
                        <ReferenceLine y={config.toleranciaMinutos} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'Tolerancia', fill: '#D97706', fontSize: 10 }} />
                        <Line type="monotone" dataKey="minutos" stroke="#1E3A8A" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center glass-panel rounded-3xl bg-white border border-slate-200 text-slate-400 font-medium">
              Seleccione un funcionario en el menú superior para visualizar su diagnóstico detallado.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 4: CONFIGURACIÓN DE HORARIOS & ASUESTOS */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="glass-panel p-8 rounded-3xl bg-white border border-slate-200/80 space-y-6 max-w-3xl animate-fadeIn">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Reglas Institucionales de Horario</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Parámetros de entrada, salida y tolerancia para el cálculo de tardanzas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Hora Oficial Entrada</label>
              <input
                type="time"
                value={configEdit.horaEntrada}
                onChange={e => setConfigEdit({ ...configEdit, horaEntrada: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Tolerancia (Minutos)</label>
              <input
                type="number"
                value={configEdit.toleranciaMinutos}
                onChange={e => setConfigEdit({ ...configEdit, toleranciaMinutos: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Hora Oficial Salida</label>
              <input
                type="time"
                value={configEdit.horaSalida}
                onChange={e => setConfigEdit({ ...configEdit, horaSalida: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          {configGuardado && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Configuración guardada correctamente en el sistema.
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleGuardarConfig}
              className="bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-md transition-all tracking-wider uppercase"
            >
              Guardar Cambios de Configuración
            </button>
          </div>
        </div>
      )}

      {/* MODAL JUSTIFICACIONES DE MOTIVO */}
      {modalMotivo.isOpen && (
        <ModalMotivo
          isOpen={modalMotivo.isOpen}
          empleado_id={modalMotivo.empleado_id}
          fecha={modalMotivo.fecha}
          nombreEmpleado={modalMotivo.nombreEmpleado}
          motivoActual={modalMotivo.motivoActual}
          observacionesActual={modalMotivo.observacionesActual}
          onClose={() => setModalMotivo({ isOpen: false, empleado_id: '', fecha: '', nombreEmpleado: '', motivoActual: '', observacionesActual: '' })}
          onSaved={() => {
            setModalMotivo({ isOpen: false, empleado_id: '', fecha: '', nombreEmpleado: '', motivoActual: '', observacionesActual: '' });
            cargar();
          }}
        />
      )}

      {/* MODAL LIGHTBOX FOTO DE EVIDENCIA SILENCIOSA */}
      {modalFotoEvidencia.isOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-hidden">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 text-center space-y-3.5 relative my-auto max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setModalFotoEvidencia({ isOpen: false, url: '', nombre: '', fechaHora: '' })}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors text-slate-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Fotografía de Evidencia Silenciosa
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">{modalFotoEvidencia.nombre}</h3>
              <p className="text-xs text-slate-500 font-mono">Capturada el {modalFotoEvidencia.fechaHora}</p>
            </div>

            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-900 aspect-video flex items-center justify-center">
              {modalFotoEvidencia.url ? (
                <img
                  src={modalFotoEvidencia.url}
                  alt={`Evidencia de ${modalFotoEvidencia.nombre}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="text-xs text-slate-400 font-medium">No hay imagen de evidencia disponible.</p>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setModalFotoEvidencia({ isOpen: false, url: '', nombre: '', fechaHora: '' })}
                className="w-full bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md uppercase tracking-wider"
              >
                Cerrar Visor de Evidencia
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
