'use client';

import { useState, useEffect } from 'react';
import { supabase, areasService, configHorariosService, configDescansosService, marcajesService, marcajesFallidosService } from '@/lib/supabase';
import { Area, ConfigHorario, ConfigDescanso, Marcaje, MarcajeFallido } from '@/types';
import { exportToExcel } from '@/lib/exportUtils';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import { createPortal } from 'react-dom';
import ModalEstacionForm from '@/components/Admin/ModalEstacionForm';
import { useAsistenciaStore } from '@/lib/store';

function getTodayStr() {
  const date = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Guatemala"}));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type Tab = 'estaciones' | 'horarios' | 'descansos' | 'reportes' | 'auditoria';

export default function ConfiguracionPage() {
  const { adminSede } = useAsistenciaStore();
  const [activeTab, setActiveTab] = useState<Tab>('estaciones');
  const [areas, setAreas] = useState<Area[]>([]);
  const [horarios, setHorarios] = useState<ConfigHorario[]>([]);
  const [descansos, setDescansos] = useState<ConfigDescanso[]>([]);
  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [intentosFallidos, setIntentosFallidos] = useState<MarcajeFallido[]>([]);
  const [estaciones, setEstaciones] = useState<any[]>([]);
  const [showEstacionModal, setShowEstacionModal] = useState(false);
  const [estacionEditar, setEstacionEditar] = useState<any | null>(null);
  const [showPasswordsMap, setShowPasswordsMap] = useState<Record<string, boolean>>({});

  const [cargando, setCargando] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Formulario Horario Modal
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [horarioForm, setHorarioForm] = useState({
    area_id: '',
    hora_entrada: '08:00',
    hora_receso_inicio: '12:00',
    hora_receso_fin: '13:00',
    hora_salida: '17:00',
    tolerancia_minutos: 15
  });

  // Formulario Descanso Modal
  const [showDescansoModal, setShowDescansoModal] = useState(false);
  const [descansoForm, setDescansoForm] = useState({
    area_id: '',
    tipo: 'dia_semana' as 'dia_semana' | 'fecha_fija' | 'rango_fechas',
    dia_semana: 0,
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: ''
  });

  // Filtros de Reportes
  const [filtrosReporte, setFiltrosReporte] = useState({
    area_id: '',
    fecha_inicio: getTodayStr(),
    fecha_fin: getTodayStr(),
    tipo: ''
  });

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showHorarioModal || showDescansoModal || showEstacionModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showHorarioModal, showDescansoModal, showEstacionModal]);

  const cargarEstaciones = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/estaciones${adminSede ? `?sede=${adminSede}` : ''}`, { headers });
      const data = await res.json();
      if (data.success) {
        setEstaciones(data.data || []);
      }
    } catch (e) {
      console.error('Error cargando estaciones:', e);
    }
  };

  const handleEliminarEstacion = async (id: string, usuario: string) => {
    if (!confirm(`¿Está seguro de eliminar el usuario de estación '${usuario}'?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/estaciones?id=${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        cargarEstaciones();
      } else {
        alert(data.error || 'Error al eliminar la estación.');
      }
    } catch (err) {
      alert('Error de conexión al eliminar la estación.');
    }
  };

  const toggleMostrarPassword = (id: string) => {
    setShowPasswordsMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: areasData } = await areasService.getAll();
      setAreas(areasData || []);

      if (activeTab === 'estaciones') {
        await cargarEstaciones();
      } else if (activeTab === 'horarios') {
        const { data: horData } = await configHorariosService.getAll();
        setHorarios(horData || []);
      } else if (activeTab === 'descansos') {
        const { data: descData } = await configDescansosService.getAll();
        setDescansos(descData || []);
      } else if (activeTab === 'reportes') {
        const { data: marData } = await marcajesService.getByRango(filtrosReporte.fecha_inicio, filtrosReporte.fecha_fin);
        setMarcajes(marData || []);
      } else if (activeTab === 'auditoria') {
        const { data: fallidosData } = await marcajesFallidosService.getRecientes(100);
        setIntentosFallidos(fallidosData || []);
      }
    } catch (e) {
      console.error('Error cargando configuración:', e);
    } finally {
      setCargando(false);
    }
  };;

  const handleGuardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configHorariosService.create({
        area_id: horarioForm.area_id || null,
        hora_entrada: horarioForm.hora_entrada,
        hora_receso_inicio: horarioForm.hora_receso_inicio || null,
        hora_receso_fin: horarioForm.hora_receso_fin || null,
        hora_salida: horarioForm.hora_salida,
        tolerancia_minutos: Number(horarioForm.tolerancia_minutos)
      });
      setShowHorarioModal(false);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando horario:', err);
    }
  };

  const handleGuardarDescanso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configDescansosService.create({
        area_id: descansoForm.area_id || null,
        tipo: descansoForm.tipo,
        dia_semana: descansoForm.tipo === 'dia_semana' ? Number(descansoForm.dia_semana) : null,
        fecha_inicio: descansoForm.fecha_inicio || null,
        fecha_fin: descansoForm.fecha_fin || null,
        descripcion: descansoForm.descripcion
      });
      setShowDescansoModal(false);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando descanso:', err);
    }
  };

  const handleExportarExcelReportes = () => {
    const dataFormatted = marcajes.map(m => ({
      Fecha: m.fecha,
      Hora: m.hora,
      Tipo: m.tipo.toUpperCase(),
      Empleado: m.empleado ? `${m.empleado.nombre} ${m.empleado.apellido}` : 'N/A',
      DPI: m.empleado?.cedula || 'N/A',
      Departamento: m.empleado?.departamento || 'N/A',
      Punto: m.punto_marcaje,
      Método: m.metodo_verificacion || 'qr_rostro',
      Confianza: `${m.confianza}%`,
      Notas: m.notas || ''
    }));

    exportToExcel(dataFormatted, `Reporte_Marcajes_${filtrosReporte.fecha_inicio}_a_${filtrosReporte.fecha_fin}`);
  };

  const handleExportarPDFReportes = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Colegio Manos a la Obra - Informe de Asistencia', 14, 20);
    doc.setFontSize(10);
    doc.text(`Rango: ${filtrosReporte.fecha_inicio} a ${filtrosReporte.fecha_fin}`, 14, 28);

    const rows = marcajes.map(m => [
      m.fecha,
      m.hora,
      m.tipo.toUpperCase(),
      m.empleado ? `${m.empleado.nombre} ${m.empleado.apellido}` : 'N/A',
      m.empleado?.departamento || 'N/A',
      m.punto_marcaje,
      `${m.confianza}%`,
      m.notas || '-'
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Fecha', 'Hora', 'Tipo', 'Empleado', 'Área', 'Punto', 'Conf.', 'Notas']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Reporte_Asistencia_${filtrosReporte.fecha_inicio}_a_${filtrosReporte.fecha_fin}.pdf`);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn pb-8">
      {/* Encabezado del Módulo COMPACTO */}
      <div className="glass-card px-5 py-3.5 bg-white border-l-8 border-l-[#1E3A8A] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 rounded-2xl">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Módulo de Configuración y Reportes Dinámicos</h1>
          <p className="text-[11px] text-slate-500 font-medium">Gestión de horarios, calendarios de descansos y auditoría de asistencia.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'estaciones' && (
            <button
              onClick={() => { setEstacionEditar(null); setShowEstacionModal(true); }}
              className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Estación Kiosco
            </button>
          )}
          {activeTab === 'horarios' && (
            <button
              onClick={() => setShowHorarioModal(true)}
              className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Horario
            </button>
          )}
          {activeTab === 'descansos' && (
            <button
              onClick={() => setShowDescansoModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Descanso
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('estaciones')}
          className={`pb-3 text-xs font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'estaciones' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📱 Estaciones Kiosco (Login Directo)
        </button>
        <button
          onClick={() => setActiveTab('horarios')}
          className={`pb-3 text-xs font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'horarios' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ⏰ Horarios por Área
        </button>
        <button
          onClick={() => setActiveTab('descansos')}
          className={`pb-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
            activeTab === 'descansos' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🌴 Días de Descanso y Festivos
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`pb-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
            activeTab === 'reportes' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📊 Reportes Dinámicos
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
            activeTab === 'auditoria' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🛡️ Auditoría (Intentos Fallidos)
        </button>
      </div>

      {/* Pestaña: Estaciones Kiosco */}
      {activeTab === 'estaciones' && (
        <div className="space-y-4">
          <div className="bg-[#1E3A8A]/5 border border-[#1E3A8A]/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🔐</span> Control de Cuentas para Estaciones de Marcaje Directo
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Cree credenciales (usuario y contraseña) para que el personal de cada estación o tableta ingrese directamente al marcaje sin necesidad de PIN adicional.
              </p>
            </div>
            <button
              onClick={() => { setEstacionEditar(null); setShowEstacionModal(true); }}
              className="px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Estación
            </button>
          </div>

          {cargando ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent animate-spin rounded-full mx-auto mb-2" />
              Cargando cuentas de estación...
            </div>
          ) : estaciones.length === 0 ? (
            <div className="glass-card bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl">
                📱
              </div>
              <h3 className="text-base font-bold text-slate-800">No hay cuentas de estación registradas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cree la primera cuenta de estación para permitir que tabletas o computadoras entren directamente al marcaje asignado (ej. Recepción, Secundaria, Preprimaria).
              </p>
              <button
                onClick={() => { setEstacionEditar(null); setShowEstacionModal(true); }}
                className="px-5 py-2.5 bg-[#1E3A8A] text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-2"
              >
                + Registrar Primera Estación
              </button>
            </div>
          ) : (
            <div className="glass-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Sede</th>
                      <th className="py-3 px-4">Estación / Ubicación</th>
                      <th className="py-3 px-4">Contraseña</th>
                      <th className="py-3 px-4 text-center">Acceso Directo</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {estaciones.map((est) => (
                      <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {est.usuario}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            est.sede === 'CAES'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            Sede {est.sede}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                            📍 {est.estacion}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-700 font-bold">
                              {showPasswordsMap[est.id] ? est.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleMostrarPassword(est.id)}
                              className="text-slate-400 hover:text-slate-700 text-[11px] font-bold underline ml-1"
                            >
                              {showPasswordsMap[est.id] ? 'Ocultar' : 'Ver'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={`/marcaje?sede=${est.sede}&punto=${encodeURIComponent(est.estacion)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors"
                          >
                            <span>🚀 Probar Marcaje</span>
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEstacionEditar(est); setShowEstacionModal(true); }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminarEstacion(est.id, est.usuario)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Horarios */}
      {activeTab === 'horarios' && (
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 pl-4">Área / Alcance</th>
                  <th className="py-2.5 px-3">Hora Entrada</th>
                  <th className="py-2.5 px-3">Receso</th>
                  <th className="py-2.5 px-3">Hora Salida</th>
                  <th className="py-2.5 px-3">Tolerancia</th>
                  <th className="py-2.5 px-3 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {horarios.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 pl-4 font-bold text-slate-900">{h.area?.nombre || 'Global (Todas las Áreas)'}</td>
                    <td className="py-2 px-3 text-blue-600 font-bold">{h.hora_entrada}</td>
                    <td className="py-2 px-3 text-slate-600">{h.hora_receso_inicio ? `${h.hora_receso_inicio} - ${h.hora_receso_fin}` : 'Sin receso'}</td>
                    <td className="py-2 px-3 text-slate-900 font-bold">{h.hora_salida}</td>
                    <td className="py-2 px-3 text-emerald-600 font-bold">{h.tolerancia_minutos} minutos</td>
                    <td className="py-2 px-3 pr-4 text-right">
                      <button onClick={() => configHorariosService.delete(h.id).then(cargarDatos)} className="text-rose-600 hover:underline font-bold">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Descansos */}
      {activeTab === 'descansos' && (
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Área / Alcance</th>
                  <th className="p-3">Tipo de Descanso</th>
                  <th className="p-3">Detalle / Rango</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {descansos.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{d.area?.nombre || 'Global (Todas las Áreas)'}</td>
                    <td className="p-3 text-slate-700 uppercase font-bold">{d.tipo.replace('_', ' ')}</td>
                    <td className="p-3 text-slate-600">
                      {d.tipo === 'dia_semana' && ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.dia_semana || 0]}
                      {d.tipo === 'fecha_fija' && d.fecha_inicio}
                      {d.tipo === 'rango_fechas' && `${d.fecha_inicio} al ${d.fecha_fin}`}
                    </td>
                    <td className="p-3 text-slate-500">{d.descripcion || '-'}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => configDescansosService.delete(d.id).then(cargarDatos)} className="text-rose-600 hover:underline font-bold">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Reportes Dinámicos */}
      {activeTab === 'reportes' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-600">Fecha Inicio</label>
              <input
                type="date"
                value={filtrosReporte.fecha_inicio}
                onChange={e => setFiltrosReporte({ ...filtrosReporte, fecha_inicio: e.target.value })}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Fecha Fin</label>
              <input
                type="date"
                value={filtrosReporte.fecha_fin}
                onChange={e => setFiltrosReporte({ ...filtrosReporte, fecha_fin: e.target.value })}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <button
              onClick={cargarDatos}
              className="py-2.5 px-4 bg-[#1E3A8A] text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Consultar Reporte
            </button>
            <div className="flex gap-2 justify-end">
              <button onClick={handleExportarExcelReportes} className="py-2.5 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg">
                Excel
              </button>
              <button onClick={handleExportarPDFReportes} className="py-2.5 px-3 bg-rose-700 text-white text-xs font-bold rounded-lg">
                PDF
              </button>
            </div>
          </div>

          <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Fecha / Hora</th>
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Departamento / Área</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Punto Marcaje</th>
                    <th className="p-3">Confianza 1:1</th>
                    <th className="p-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {marcajes.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-700">{m.fecha} {m.hora}</td>
                      <td className="p-3 font-bold text-slate-900">{m.empleado ? `${m.empleado.nombre} ${m.empleado.apellido}` : 'N/A'}</td>
                      <td className="p-3 text-slate-600">{m.empleado?.departamento || '-'}</td>
                      <td className="p-3 font-bold uppercase">{m.tipo}</td>
                      <td className="p-3 text-slate-600">{m.punto_marcaje}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{m.confianza}%</td>
                      <td className="p-3 text-amber-600 font-medium">{m.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Auditoría Intentos Fallidos */}
      {activeTab === 'auditoria' && (
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Registro de Intentos de Marcaje Rechazados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50 text-rose-800 font-bold uppercase tracking-wider border-b border-rose-200">
                <tr>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Empleado Reclamado</th>
                  <th className="p-3">QR Escaneado</th>
                  <th className="p-3">Distancia Facial</th>
                  <th className="p-3">Punto de Marcaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {intentosFallidos.map(f => (
                  <tr key={f.id} className="hover:bg-rose-50/50">
                    <td className="p-3 font-mono font-bold text-slate-700">{new Date(f.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-900">{f.empleado ? `${f.empleado.nombre} ${f.empleado.apellido}` : 'Desconocido'}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">{f.qr_escaneado}</td>
                    <td className="p-3 font-mono font-bold text-rose-600">{(Number(f.distancia_facial) || 0).toFixed(3)}</td>
                    <td className="p-3 text-slate-600">{f.punto_marcaje || 'Kiosco Web'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear Horario */}
      {showHorarioModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Nuevo Horario por Área</h3>
            <form onSubmit={handleGuardarHorario} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Área Asignada</label>
                <select
                  value={horarioForm.area_id}
                  onChange={e => setHorarioForm({ ...horarioForm, area_id: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="">Global (Todas las Áreas)</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Hora Entrada</label>
                  <input
                    type="time"
                    value={horarioForm.hora_entrada}
                    onChange={e => setHorarioForm({ ...horarioForm, hora_entrada: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Hora Salida</label>
                  <input
                    type="time"
                    value={horarioForm.hora_salida}
                    onChange={e => setHorarioForm({ ...horarioForm, hora_salida: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Tolerancia (Minutos)</label>
                <input
                  type="number"
                  value={horarioForm.tolerancia_minutos}
                  onChange={e => setHorarioForm({ ...horarioForm, tolerancia_minutos: Number(e.target.value) })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowHorarioModal(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-lg">Guardar Horario</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Crear Descanso */}
      {showDescansoModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Nuevo Día de Descanso o Festivo</h3>
            <form onSubmit={handleGuardarDescanso} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Área Asignada</label>
                <select
                  value={descansoForm.area_id}
                  onChange={e => setDescansoForm({ ...descansoForm, area_id: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="">Global (Todas las Áreas)</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Tipo de Descanso</label>
                <select
                  value={descansoForm.tipo}
                  onChange={e => setDescansoForm({ ...descansoForm, tipo: e.target.value as any })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="dia_semana">Día de la Semana Recurrente</option>
                  <option value="fecha_fija">Fecha Fija (Ej. Festivo)</option>
                  <option value="rango_fechas">Rango de Fechas (Ej. Vacaciones)</option>
                </select>
              </div>
              {descansoForm.tipo === 'dia_semana' && (
                <div>
                  <label className="text-xs font-bold text-slate-600">Día de la Semana</label>
                  <select
                    value={descansoForm.dia_semana}
                    onChange={e => setDescansoForm({ ...descansoForm, dia_semana: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value={0}>Domingo</option>
                    <option value={6}>Sábado</option>
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                  </select>
                </div>
              )}
              {descansoForm.tipo !== 'dia_semana' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Fecha Inicio</label>
                    <input
                      type="date"
                      value={descansoForm.fecha_inicio}
                      onChange={e => setDescansoForm({ ...descansoForm, fecha_inicio: e.target.value })}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  {descansoForm.tipo === 'rango_fechas' && (
                    <div>
                      <label className="text-xs font-bold text-slate-600">Fecha Fin</label>
                      <input
                        type="date"
                        value={descansoForm.fecha_fin}
                        onChange={e => setDescansoForm({ ...descansoForm, fecha_fin: e.target.value })}
                        className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-600">Descripción / Motivo</label>
                <input
                  type="text"
                  value={descansoForm.descripcion}
                  onChange={e => setDescansoForm({ ...descansoForm, descripcion: e.target.value })}
                  placeholder="ej. Día del Maestro / Vacaciones"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowDescansoModal(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg">Guardar Descanso</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Estación Form */}
      <ModalEstacionForm
        isOpen={showEstacionModal}
        onClose={() => setShowEstacionModal(false)}
        onSuccess={() => cargarDatos()}
        adminSede={adminSede}
        estacionEditar={estacionEditar}
      />

    </div>
  );
}
