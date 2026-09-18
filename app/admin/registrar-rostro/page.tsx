'use client';

import { useState, useEffect } from 'react';
import { empleadosService } from '@/lib/supabase';
import { Empleado } from '@/types';
import CapturaRostro from '@/components/Admin/CapturaRostro';
import CarnetDigitalModal from '@/components/Admin/CarnetDigitalModal';
import { useAsistenciaStore } from '@/lib/store';

function hasValidFaceDescriptor(fd: any): boolean {
  if (!fd) return false;
  if (typeof fd === 'string') {
    try {
      fd = JSON.parse(fd);
    } catch {
      return false;
    }
  }
  if (!fd) return false;
  if (Array.isArray(fd)) {
    if (fd.length === 0) return false;
    if (fd.length === 128 && typeof fd[0] === 'number') return true;
    if (Array.isArray(fd[0]) && fd[0].length === 128 && typeof fd[0][0] === 'number') return true;
  }
  return false;
}

export default function RegistrarRostroPage() {
  const [todosEmpleados, setTodosEmpleados] = useState<Empleado[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [capturando, setCapturando] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [modalCarnetEmpleado, setModalCarnetEmpleado] = useState<Empleado | null>(null);
  const [showCarnetModal, setShowCarnetModal] = useState(false);
  const [auditando, setAuditando] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const { adminSede } = useAsistenciaStore();

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const { data } = await empleadosService.getAll(adminSede || undefined);
      const lista = data || [];
      setTodosEmpleados(lista);
      setEmpleados(lista.filter(e => !hasValidFaceDescriptor(e.face_descriptor)));

      // Detectar si viene empleadoId en la URL
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const empIdParam = params.get('empleadoId') || params.get('id');
        if (empIdParam) {
          const empMatch = lista.find(e => e.id === empIdParam);
          if (empMatch) {
            setEmpleadoSeleccionado(empMatch.id);
            setMostrarTodos(true);
            setCapturando(true);
          }
        }
      }
    } catch (e) {
      console.error('Error cargando empleados:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    if (capturando) return;
    const syncInterval = setInterval(() => {
      cargar();
    }, 15000);
    return () => clearInterval(syncInterval);
  }, [adminSede, capturando]);

  if (cargando) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-navy-900 animate-spin rounded-full"></div>
    </div>
  );

  if (capturando && empleadoSeleccionado) {
    const listadoActual = mostrarTodos ? todosEmpleados : empleados;
    const emp = listadoActual.find(e => e.id === empleadoSeleccionado) || todosEmpleados.find(e => e.id === empleadoSeleccionado);
    return (
      <div className="-m-10 h-[calc(100vh-5rem)] flex flex-col animate-fadeIn">
        {/* Header compacto */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setCapturando(false); setEmpleadoSeleccionado(''); }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-navy-900"
              title="Volver"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Enrolamiento Biométrico y Generación de QR</h2>
              <p className="text-xs text-slate-400">Funcionario: <span className="text-slate-600 font-semibold uppercase">{emp?.nombre} {emp?.apellido}</span></p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-navy-50 border border-navy-100 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-navy-700"></div>
            <span className="text-[10px] font-bold text-navy-900 tracking-widest uppercase">ID: {emp?.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Área de cámara */}
        <div className="flex-1 overflow-hidden">
          <CapturaRostro
            empleadoId={empleadoSeleccionado}
            onCancel={() => { setCapturando(false); setEmpleadoSeleccionado(''); }}
            onSuccess={async () => {
              // Obtener datos actualizados del empleado incluyendo su qr_code
              const { data: updatedEmp } = await empleadosService.getById(empleadoSeleccionado);
              setCapturando(false);
              setEmpleadoSeleccionado('');
              cargar();
              if (updatedEmp) {
                setModalCarnetEmpleado(updatedEmp);
                setShowCarnetModal(true);
              }
            }}
          />
        </div>

        {/* Modal de Carnet Digital */}
        <CarnetDigitalModal
          isOpen={showCarnetModal}
          onClose={() => setShowCarnetModal(false)}
          empleado={modalCarnetEmpleado}
        />
      </div>
    );
  }

  const listaFiltrada = (mostrarTodos ? todosEmpleados : empleados).filter(e =>
    !busqueda ||
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.cedula.includes(busqueda)
  );

  const ejecutarAuditoria = async () => {
    setAuditando(true);
    try {
      const res = await fetch('/api/empleados/auditar-biometria');
      const data = await res.json();
      setAuditReport(data);
    } catch (_) {
      alert('Error ejecutando la auditoría biométrica.');
    } finally {
      setAuditando(false);
    }
  };

  return (
    <div className="space-y-3.5 animate-fadeIn pb-8">

      {/* HEADER CORPORATIVO COMPACTO CON AGENTE AUDITOR */}
      <div className="glass-panel px-5 py-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Registro de Identidad Digital</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {empleados.length} Pendientes | {todosEmpleados.length - empleados.length} Enrolados | {todosEmpleados.length} Total
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Agente Auditor */}
          <button
            onClick={ejecutarAuditoria}
            disabled={auditando}
            className="flex items-center gap-2 bg-navy-50 hover:bg-navy-100 text-navy-900 px-3 py-1.5 rounded-xl border border-navy-200 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            title="Ejecutar Agente de Auditoría de Salud Biométrica"
          >
            {auditando ? (
              <div className="w-3.5 h-3.5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🛡️ Agente Auditor</span>
            )}
          </button>

          {/* Toggle para mostrar todo el personal y re-enrolar */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-800 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Ver todo el personal (Permitir re-enrolar)</span>
          </label>
        </div>
      </div>

      {/* Modal de Reporte del Agente Auditor */}
      {auditReport && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">🛡️ Diagnóstico del Agente Biométrico:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${auditReport.saludGeneral === 'EXCELENTE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                {auditReport.saludGeneral}
              </span>
            </div>
            <button onClick={() => setAuditReport(null)} className="text-xs text-slate-400 hover:text-white font-bold">✕ Cerrar</button>
          </div>
          <p className="text-xs text-slate-300">
            Total Enrolados Analizados: <strong className="text-white">{auditReport.totalEnrolados}</strong> | Conflictos de Duplicidad: <strong className="text-emerald-400">{auditReport.totalConflictos}</strong>
          </p>
          {auditReport.conflictos && auditReport.conflictos.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-amber-400 font-bold">Conflictos Detectados:</p>
              {auditReport.conflictos.map((c: any, idx: number) => (
                <div key={idx} className="p-2 bg-slate-800 rounded-lg text-xs flex justify-between">
                  <span>{c.empleado1} ↔ {c.empleado2}</span>
                  <span className="text-amber-300 font-mono font-bold">Dist: {c.distanciaCentroide}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL DE SELECCIÓN */}
        <div className="lg:col-span-5">
          <div className="glass-card p-8 space-y-8 bg-white border-slate-200 shadow-sm border-t-4 border-t-navy-900 h-fit sticky top-6">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center border border-navy-100">
                <svg className="w-5 h-5 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 8h12m4 0h2M4 16h4m12 0h2M4 20h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">
                  {mostrarTodos ? 'Seleccionar para Re-enrolar' : 'Iniciar Enrolamiento'}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Seleccione un funcionario para proceder con la captura biométrica o actualizar su perfil existente.
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="input-busqueda-rostro" className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Buscar Funcionario</label>
                  <div className="relative">
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      id="input-busqueda-rostro"
                      type="text"
                      placeholder="Buscar por nombre, apellido o DPI..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="select-empleado-rostro" className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">
                    {mostrarTodos ? 'Todo el Personal Registrado' : 'Listado de Pendientes'}
                  </label>
                  <select
                    id="select-empleado-rostro"
                    value={empleadoSeleccionado}
                    onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                    className="w-full h-14 font-medium text-slate-700 border border-slate-200 rounded-xl px-3 bg-white"
                  >
                    <option value="">Seleccione un funcionario...</option>
                    {listaFiltrada.map((e) => {
                      const tieneRostro = hasValidFaceDescriptor(e.face_descriptor);
                      return (
                        <option key={e.id} value={e.id}>
                          {e.nombre.toUpperCase()} {e.apellido.toUpperCase()} ({e.cedula}) {tieneRostro ? '— [✓ Enrolado (Click para Re-enrolar)]' : '— [⚠️ Pendiente]'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setCapturando(true)}
                disabled={!empleadoSeleccionado}
                className="w-full btn-primary h-14 flex items-center justify-center gap-3 tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed group transition-all"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                ACTIVAR ESCÁNER Y ENROLAR
              </button>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    El sistema sobrescribirá el perfil biométrico del funcionario seleccionado si ya tenía uno anterior.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTADO DE PENDIENTES / PERSONAL */}
        <div className="lg:col-span-7">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {mostrarTodos ? 'Catálogo General de Personal' : 'Cola de Espera Técnica (Pendientes)'}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">V2.5.0_STABLE</span>
            </div>

            <div className="divide-y divide-slate-100">
              {listaFiltrada.map((e) => {
                const tieneRostro = hasValidFaceDescriptor(e.face_descriptor);
                return (
                  <div key={e.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[11px] group-hover:bg-navy-100 group-hover:text-navy-900 transition-colors">
                        {e.nombre[0]}{e.apellido[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{e.nombre} {e.apellido}</p>
                          {tieneRostro ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-full">
                              ✓ Enrolado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold rounded-full">
                              ⚠️ Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400">ID: {e.cedula} • Sede: {e.sede || 'ROOS'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tieneRostro && (
                        <button
                          onClick={async () => {
                            if (confirm(`¿Deseas borrar el registro facial de ${e.nombre} ${e.apellido}? Se permitirá enrolar nuevamente desde cero.`)) {
                              try {
                                const res = await fetch('/api/empleados/limpiar-rostro', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ empleadoId: e.id })
                                });
                                if (res.ok) {
                                  alert(`Biometría facial de ${e.nombre} eliminada correctamente.`);
                                  cargar();
                                } else {
                                  alert('Error al borrar biometría facial.');
                                }
                              } catch (_) {
                                alert('Error de conexión al borrar biometría.');
                              }
                            }
                          }}
                          className="px-2.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors font-bold text-xs"
                          title="Borrar Biometría Facial Registrada"
                        >
                          🗑️ Limpiar
                        </button>
                      )}
                      <button
                        onClick={() => { setEmpleadoSeleccionado(e.id); setCapturando(true); }}
                        className="px-3 py-2 flex items-center gap-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-navy-900 hover:border-navy-900 hover:bg-white transition-all shadow-2xs font-bold text-xs"
                        title={tieneRostro ? "Re-enrolar Rostro" : "Enrolar Rostro"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {tieneRostro ? 'Re-enrolar' : 'Enrolar'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {listaFiltrada.length === 0 && (
                <div className="py-24 text-center">
                  <div className="w-12 h-12 bg-success/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-success/10">
                    <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-success">
                    {mostrarTodos ? 'No se encontraron funcionarios.' : 'Personal 100% Validado en el Sistema.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {mostrarTodos ? 'Intenta con otro término de búsqueda.' : 'Activa "Ver todo el personal" para re-enrolar a cualquier funcionario.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
