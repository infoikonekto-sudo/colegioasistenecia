'use client';

import { useState, useEffect } from 'react';
import { empleadosService } from '@/lib/supabase';
import { Empleado } from '@/types';
import EmpleadoForm from '@/components/Admin/EmpleadoForm';
import ModalImportarExcel from '@/components/Admin/ModalImportarExcel';
import CarnetDigitalModal from '@/components/Admin/CarnetDigitalModal';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { useAsistenciaStore } from '@/lib/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Filtros {
  busqueda: string;
  departamento: string;
  subarea: string;
  sede: string;
  mostrarInactivos: boolean;
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [empleadoEditar, setEmpleadoEditar] = useState<Empleado | null>(null);
  const { adminSede } = useAsistenciaStore();
  const [filtros, setFiltros] = useState<Filtros>({ busqueda: '', departamento: '', subarea: '', sede: '', mostrarInactivos: false });
  const [empleadoEliminar, setEmpleadoEliminar] = useState<Empleado | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [isModalImportarOpen, setIsModalImportarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Carnet Digital Modal
  const [carnetEmpleado, setCarnetEmpleado] = useState<Empleado | null>(null);
  const [isCarnetOpen, setIsCarnetOpen] = useState(false);

  // Vista (Tabla / Tarjetas)
  const [vistaModo, setVistaModo] = useState<'tabla' | 'tarjetas'>('tabla');

  useEffect(() => {
    setIsMounted(true);
    if (adminSede && !filtros.sede) {
      setFiltros(prev => ({ ...prev, sede: adminSede }));
    }
  }, [adminSede]);

  useEffect(() => {
    cargar();
  }, [filtros.sede, filtros.mostrarInactivos]);

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const activeSede = filtros.sede || undefined;
      const { data } = await empleadosService.getAll(activeSede, filtros.mostrarInactivos);
      setEmpleados(data || []);
    } catch (e) {
      console.error('Error cargando empleados:', e);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  const inactivar = async () => {
    if (!empleadoEliminar) return;
    setEliminando(true);
    try {
      await empleadosService.update(empleadoEliminar.id, { activo: false });
      setEmpleadoEliminar(null);
      cargar();
    } catch (e) {
      console.error('Error inactivando empleado:', e);
      alert('No se pudo inactivar el funcionario. Intente de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  const reactivar = async (id: string) => {
    if (!confirm('¿Está seguro de reactivar a este funcionario?')) return;
    try {
      await empleadosService.update(id, { activo: true });
      cargar();
    } catch (e) {
      console.error('Error reactivando empleado:', e);
      alert('No se pudo reactivar el funcionario. Intente de nuevo.');
    }
  };

  const isAmbas = (s?: string) => Boolean(s && s.toUpperCase().includes('AMBA'));

  const filtrados = empleados.filter(e => {
    const matchBusqueda = (
      e.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      e.apellido.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      e.cedula.includes(filtros.busqueda)
    );
    const matchDepto = !filtros.departamento || e.departamento === filtros.departamento;
    const matchSubarea = !filtros.subarea || e.subarea === filtros.subarea;

    let matchSede = true;
    if (filtros.sede) {
      if (isAmbas(filtros.sede)) {
        matchSede = isAmbas(e.sede);
      } else {
        matchSede = e.sede?.toUpperCase() === filtros.sede.toUpperCase() || isAmbas(e.sede);
      }
    }
    return matchBusqueda && matchDepto && matchSubarea && matchSede;
  });

  const departamentosUnicos = Array.from(new Set(empleados.map(e => e.departamento).filter(Boolean))).sort();
  const subareasUnicas = Array.from(new Set(empleados.map(e => e.subarea).filter(Boolean))).sort();

  const totalEnrolados = empleados.filter(e => e.face_descriptor && Array.isArray(e.face_descriptor) && e.face_descriptor.length > 0).length;
  const pctEnrolados = empleados.length > 0 ? Math.round((totalEnrolados / empleados.length) * 100) : 0;

  const handleExportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const tituloSede = adminSede ? ` - Sede ${adminSede}` : '';
    doc.text(`Colegio Manos a la Obra - Directorio de Personal${tituloSede}`, 14, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 19);

    const rows = filtrados.map(e => [
      `${e.nombre} ${e.apellido}`,
      e.cedula,
      e.departamento || 'N/A',
      e.cargo || 'Funcionario',
      e.sede || 'ROOS',
      e.activo ? 'Activo' : 'Inactivo',
      e.face_descriptor ? 'Enrolado' : 'Pendiente'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Nombre Completo', 'Identificación / DPI', 'Departamento', 'Cargo', 'Sede', 'Estado', 'Biometría']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const suffix = adminSede ? `_Sede_${adminSede}` : '';
    doc.save(`Directorio_Personal${suffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (cargando) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1E3A8A] animate-spin rounded-full"></div>
    </div>
  );

  if (mostrarForm) return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <button
        onClick={() => { setMostrarForm(false); setEmpleadoEditar(null); }}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1E3A8A] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        VOLVER AL LISTADO DE PERSONAL
      </button>
      <EmpleadoForm
        empleado={empleadoEditar}
        onSuccess={() => { setMostrarForm(false); setEmpleadoEditar(null); cargar(true); }}
      />
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="space-y-3.5 animate-fadeIn pb-8">

      {/* HEADER PRINCIPAL Y ESTADÍSTICAS COMPACTAS */}
      <div className="glass-card bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-slate-200 border-l-8 border-l-[#1E3A8A] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Directorio General de Personal</h1>
          <p className="text-[11px] text-slate-500 font-medium">Gestión de plantilla, sedes y credenciales biométricas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setCarnetEmpleado(null); setIsCarnetOpen(true); }}
            className="px-3 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 border border-indigo-700/50"
            title="Imprimir carnets QR para los funcionarios listados"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Carnets QR ({filtrados.length})
          </button>

          <button
            onClick={() => setIsModalImportarOpen(true)}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar Excel
          </button>
          
          <button
            onClick={() => { setEmpleadoEditar(null); setMostrarForm(true); }}
            className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Funcionario
          </button>
        </div>
      </div>

      {/* METRICAS KPI DE PERSONAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Plantilla Total</span>
          <span className="text-xl font-black text-slate-900 block">{filtrados.length}</span>
          <span className="text-[9px] text-slate-500 font-medium">Funcionarios listados</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Rostro Enrolado</span>
          <span className="text-xl font-black text-emerald-600 block">{totalEnrolados}</span>
          <span className="text-[9px] text-emerald-700 font-bold">{pctEnrolados}% cobertura</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">Sede ROOS</span>
          <span className="text-xl font-black text-blue-900 block">
            {empleados.filter(e => e.sede === 'ROOS' || isAmbas(e.sede)).length}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">ROOS / Ambas</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Sede CAES</span>
          <span className="text-xl font-black text-emerald-800 block">
            {empleados.filter(e => e.sede === 'CAES' || isAmbas(e.sede)).length}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">CAES / Ambas</span>
        </div>
      </div>

      {/* PANEL DE FILTROS Y VISTA TOGGLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Búsqueda */}
          <div className="md:col-span-3">
            <label htmlFor="search-input-empl" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">🔍 Buscar Funcionario</label>
            <input
              id="search-input-empl"
              type="text"
              placeholder="Nombre, Cédula..."
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 bg-slate-50/50"
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
            />
          </div>

          {/* Departamento */}
          <div className="md:col-span-3">
            <label htmlFor="select-depto-empl" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Departamento</label>
            <select
              id="select-depto-empl"
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-white"
              value={filtros.departamento}
              onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}
            >
              <option value="">Todos</option>
              {departamentosUnicos.map(d => <option key={String(d)} value={String(d)}>{String(d)}</option>)}
            </select>
          </div>

          {/* Sede */}
          <div className="md:col-span-2">
            <label htmlFor="select-sede-empl" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Sede</label>
            <select
              id="select-sede-empl"
              className="w-full h-10 text-xs font-bold border border-slate-200 rounded-xl px-3 bg-white text-[#1E3A8A] cursor-pointer hover:border-slate-300 transition-colors"
              value={filtros.sede}
              onChange={(e) => setFiltros({ ...filtros, sede: e.target.value })}
            >
              {adminSede === 'ROOS' ? (
                <>
                  <option value="ROOS">Roosevelt (ROOS)</option>
                  <option value="AMBAS">Ambas Sedes</option>
                </>
              ) : adminSede === 'CAES' ? (
                <>
                  <option value="CAES">Carr. El Salvador (CAES)</option>
                  <option value="AMBAS">Ambas Sedes</option>
                </>
              ) : (
                <>
                  <option value="">Todas las Sedes</option>
                  <option value="ROOS">Sede Roosevelt (ROOS)</option>
                  <option value="CAES">Sede Carr. El Salvador (CAES)</option>
                  <option value="AMBAS">Ambas Sedes</option>
                </>
              )}
            </select>
          </div>

          {/* Mostrar Inactivos */}
          <div className="md:col-span-2 flex items-center justify-center pt-4 md:pt-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                checked={filtros.mostrarInactivos}
                onChange={(e) => setFiltros({ ...filtros, mostrarInactivos: e.target.checked })}
              />
              Ver Inactivos
            </label>
          </div>

          {/* Toggle Vista & Exportaciones */}
          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-4 md:pt-0">
            <button
              onClick={() => setVistaModo(vistaModo === 'tabla' ? 'tarjetas' : 'tabla')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
            >
              {vistaModo === 'tabla' ? '📇' : '📋'}
            </button>
            <button
              onClick={() => exportToExcel(filtrados, `personal-institucional`)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Excel
            </button>
            <button
              onClick={handleExportarPDF}
              className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* RENDERIZADO TABLA O TARJETAS */}
      {vistaModo === 'tabla' ? (
        <div className="glass-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 pl-4">Funcionario</th>
                  <th className="py-2.5 px-3">Identificación / DPI</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Sede</th>
                  <th className="py-2.5 px-3">Estado Biométrico</th>
                  <th className="py-2.5 px-3 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        {e.foto_url ? (
                          <img src={e.foto_url} alt={e.nombre} className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-2xs" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold text-[11px] flex items-center justify-center border border-[#1E3A8A]/20">
                            {e.nombre[0]}{e.apellido[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{e.nombre} {e.apellido}</p>
                          <p className="text-[9px] text-slate-400">{e.email || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-700">{e.cedula}</td>
                    <td className="py-2 px-3 text-slate-600 font-bold uppercase text-[11px]">{e.departamento}</td>
                    <td className="py-2 px-3 text-slate-600">{e.cargo || 'Funcionario'}</td>
                    <td className="py-2 px-3">
                      <span className="inline-block bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold text-[9px] px-2 py-0.5 rounded-full uppercase border border-[#1E3A8A]/20">
                        {e.sede || 'ROOS'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {e.face_descriptor ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-200">
                          ✓ ENROLADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-200">
                          ⌛ PENDIENTE
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {e.qr_code && (
                          <button
                            onClick={() => { setCarnetEmpleado(e); setIsCarnetOpen(true); }}
                            className="px-2.5 py-1 bg-[#1E3A8A]/10 hover:bg-[#1E3A8A]/20 text-[#1E3A8A] font-bold text-[11px] rounded-lg transition-colors"
                            title="Ver Carnet QR"
                          >
                            📇 Carnet
                          </button>
                        )}
                        <button
                          onClick={() => { setEmpleadoEditar(e); setMostrarForm(true); }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        {e.activo ? (
                          <button
                            onClick={() => setEmpleadoEliminar(e)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition-colors"
                          >
                            Inactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivar(e.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA EN TARJETAS CREDENCIAL */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((e) => (
            <div key={e.id} className="bg-white border-2 border-slate-200 hover:border-[#1E3A8A] rounded-2xl p-5 shadow-sm space-y-3 transition-all relative">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-wider">Colegio Manos a la Obra</span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{e.cedula}</span>
              </div>
              <div className="flex items-center gap-4">
                {e.foto_url ? (
                  <img src={e.foto_url} alt={e.nombre} className="w-16 h-16 rounded-full object-cover border-2 border-[#1E3A8A] shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold text-lg flex items-center justify-center border-2 border-[#1E3A8A]/20">
                    {e.nombre[0]}{e.apellido[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{e.nombre} {e.apellido}</h4>
                  <p className="text-xs font-semibold text-blue-600">{e.cargo || 'Funcionario'} • {e.departamento}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sede: {e.sede || 'ROOS'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                {e.qr_code ? (
                  <button
                    onClick={() => { setCarnetEmpleado(e); setIsCarnetOpen(true); }}
                    className="text-xs font-bold text-[#1E3A8A] hover:underline"
                  >
                    📇 Ver Carnet Digital ({e.qr_code})
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600">Pendiente QR</span>
                )}
                <button
                  onClick={() => { setEmpleadoEditar(e); setMostrarForm(true); }}
                  className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Carnet Digital Modal */}
      <CarnetDigitalModal
        isOpen={isCarnetOpen}
        onClose={() => { setIsCarnetOpen(false); setCarnetEmpleado(null); }}
        empleado={carnetEmpleado}
        empleadosLista={!carnetEmpleado ? filtrados : undefined}
      />

      {/* Modal Importar Excel */}
      <ModalImportarExcel 
        isOpen={isModalImportarOpen} 
        onClose={() => setIsModalImportarOpen(false)} 
        onSuccess={() => {
          setIsModalImportarOpen(false);
          cargar();
        }} 
      />
    </div>
  );
}
