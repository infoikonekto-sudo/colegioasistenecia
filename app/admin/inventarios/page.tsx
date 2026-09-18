'use client';

import { useState, useEffect } from 'react';
import { inventarioItemsService, inventarioMovimientosService, empleadosService } from '@/lib/supabase';
import { useAsistenciaStore } from '@/lib/store';
import ModalNuevoItem from '@/components/Admin/Inventario/ModalNuevoItem';
import ModalMovimiento from '@/components/Admin/Inventario/ModalMovimiento';
import { generarValeEntrega } from '@/lib/valePDF';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel } from '@/lib/exportUtils';

function getTodayStr() {
  const date = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Guatemala"}));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function exportarPDF(columnas: string[], filas: string[][], titulo: string, sede: string | null = null, resumen?: any[]) {
  const orientation = columnas.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation });
  
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const tituloCompleto = sede ? `Colegio Manos a la Obra - SEDE ${sede}` : 'Colegio Manos a la Obra';
  doc.text(tituloCompleto, 14, 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${titulo} | Generado: ${new Date().toLocaleString('es-ES')}`, 14, 19);
  
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: 30,
    styles: { fontSize: 7, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  if (resumen && resumen.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen por Categorías', 14, finalY);
    autoTable(doc, {
      head: [['Categoría', 'Total Artículos', 'Valor Estimado']],
      body: resumen.map(r => [r.Categoria, r.Articulos.toString(), r.Valor]),
      startY: finalY + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [6, 78, 59], textColor: 255 }
    });
  }
  
  const nombreFinal = sede ? `${titulo.replace(/\s+/g, '-').toLowerCase()}-sede-${sede.toLowerCase()}` : titulo.replace(/\s+/g, '-').toLowerCase();
  doc.save(`${nombreFinal}-${getTodayStr()}.pdf`);
}

export default function InventariosPage() {
  const [items, setItems] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<'catalogo' | 'casos_especiales' | 'movimientos'>('catalogo');
  
  // Modals state
  const [isNuevoItemOpen, setIsNuevoItemOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<any | null>(null);
  const [movModalConfig, setMovModalConfig] = useState<{isOpen: boolean, item: any, tipo: 'entrada'|'salida'}>({
    isOpen: false, item: null, tipo: 'entrada'
  });

  // Filters state
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroTalla, setFiltroTalla] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'sin_stock'>('todos');

  const { adminSede } = useAsistenciaStore();

  const cargarDatos = async () => {
    setCargando(true);
    const [itemsRes, movsRes] = await Promise.all([
      inventarioItemsService.getAll(adminSede || undefined),
      inventarioMovimientosService.getRecientes(adminSede || undefined, 50)
    ]);
    
    if (itemsRes.data) setItems(itemsRes.data);
    if (movsRes.data) setMovimientos(movsRes.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [adminSede]);

  const handleCrearItem = async (itemData: any) => {
    if (itemData.id) {
      const { id, ...dataToUpdate } = itemData;
      await inventarioItemsService.update(id, dataToUpdate);
    } else {
      const res = await inventarioItemsService.create(itemData);
      if (res.data && itemData.stock_actual > 0) {
        await inventarioMovimientosService.registrarMovimiento({
          item_id: res.data.id,
          tipo: 'entrada',
          cantidad: itemData.stock_actual,
          empleado_id: null,
          departamento: 'Inventario Inicial',
          notas: 'Registro de stock inicial al crear el ítem'
        });
      }
    }

    await cargarDatos();
    setIsNuevoItemOpen(false);
    setItemEditando(null);
  };

  const handleRegistrarMovimiento = async (movData: any, firmaBase64?: string) => {
    const dataToSave = { ...movData };
    if (firmaBase64) {
      dataToSave.notas = (dataToSave.notas || '') + '|FIRMA_DIGITAL|' + firmaBase64;
    }

    const res = await inventarioMovimientosService.registrarMovimiento(dataToSave);
    if (res.error) {
      alert(res.error.message || 'Error al registrar el movimiento.');
      return;
    }
    await cargarDatos();
    setMovModalConfig({ ...movModalConfig, isOpen: false });

    if (movData.tipo === 'salida' && movData.empleado_id) {
      const empleado = empleadosService.getAll(adminSede || undefined).then(r => r.data?.find(e => e.id === movData.empleado_id));
      const item = inventarioItemsService.getAll(adminSede || undefined).then(r => r.data?.find(i => i.id === movData.item_id));
      
      Promise.all([empleado, item]).then(([empData, itemData]) => {
        if (empData && itemData) {
          const movParaVale = {
            ...movData,
            fecha: new Date().toISOString(),
            empleado: empData,
            item: itemData
          };
          generarValeEntrega(movParaVale, adminSede || 'ROOS', firmaBase64);
        }
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este ítem? No se podrá recuperar.')) {
      await inventarioItemsService.delete(id);
      await cargarDatos();
    }
  };

  // KPIs y Filtrado
  const itemsFiltrados = items.filter(i => {
    const isEspecial = i.categoria === 'Casos Especiales' || 
                       i.area_asignada === 'Casos Especiales' || 
                       (i.descripcion && i.descripcion.includes('[PARA:'));

    if (tab === 'casos_especiales') {
      if (!isEspecial) return false;
    } else if (tab === 'catalogo') {
      if (isEspecial) return false;
    }

    const matchNombre = i.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const matchCat = filtroCategoria === '' || i.categoria === filtroCategoria;
    const matchTalla = filtroTalla === '' || (i.talla_o_medida && i.talla_o_medida.includes(filtroTalla));
    const matchGenero = filtroGenero === '' || i.genero === filtroGenero;
    const matchArea = filtroArea === '' || (i.area_asignada && i.area_asignada === filtroArea);
    const matchProveedor = filtroProveedor === '' || (i.proveedor && i.proveedor === filtroProveedor);
    const matchStock = filtroStock === 'todos' ||
      (filtroStock === 'bajo' && i.stock_actual > 0 && i.stock_actual <= 5) ||
      (filtroStock === 'sin_stock' && i.stock_actual === 0);
    return matchNombre && matchCat && matchTalla && matchGenero && matchArea && matchProveedor && matchStock;
  });

  const totalItems = itemsFiltrados.length;
  const totalFisico = itemsFiltrados.reduce((acc, i) => acc + (Number(i.stock_actual) || 0), 0);
  const stockBajo = itemsFiltrados.filter(i => i.stock_actual > 0 && i.stock_actual <= 5).length;
  const sinStock = itemsFiltrados.filter(i => i.stock_actual === 0).length;
  const valorTotal = itemsFiltrados.reduce((acc, i) => acc + (Number(i.stock_actual) * Number(i.precio_unitario || 0)), 0);

  const categoriasUnicas = Array.from(new Set(items.map(i => i.categoria))).filter(Boolean) as string[];
  const generosUnicos = Array.from(new Set(items.map(i => i.genero))).filter(Boolean) as string[];
  const areasUnicas = Array.from(new Set(items.map(i => i.area_asignada))).filter(Boolean) as string[];
  const proveedoresUnicos = Array.from(new Set(items.map(i => i.proveedor))).filter(Boolean) as string[];

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* HEADER CORPORATIVO */}
      <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-8 border-l-[#1E3A8A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Inventarios {adminSede ? `- Sede ${adminSede}` : ''}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Control de catálogo, entradas, salidas y vales de entrega a personal.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              let resumenData: any[] | undefined = undefined;
              if (tab === 'catalogo' || tab === 'casos_especiales') {
                resumenData = categoriasUnicas.map(cat => {
                  const itemsCat = itemsFiltrados.filter(i => i.categoria === cat);
                  const articulos = itemsCat.reduce((acc, i) => acc + (Number(i.stock_actual) || 0), 0);
                  const totalValor = itemsCat.reduce((acc, i) => acc + ((Number(i.stock_actual) || 0) * (Number(i.precio_unitario) || 0)), 0);
                  return { Categoria: cat, Articulos: articulos, Valor: `Q${totalValor.toFixed(2)}`, rawValor: totalValor };
                });
                const totalArt = resumenData.reduce((acc, r) => acc + r.Articulos, 0);
                const totalVal = resumenData.reduce((acc, r) => acc + r.rawValor, 0);
                resumenData.push({ Categoria: 'TOTAL GENERAL', Articulos: totalArt, Valor: `Q${totalVal.toFixed(2)}` });
                resumenData.forEach(r => delete r.rawValor);
              }
              
              const dataExportar = (tab === 'catalogo' || tab === 'casos_especiales') ? itemsFiltrados.map(i => ({
                Sede: i.sede, Nombre: i.nombre, Categoria: i.categoria, 'Talla/Unidad': i.talla_o_medida || 'N/A', 
                Género: i.genero || 'N/A', 'Área': i.area_asignada || 'General',
                'Precio Unit.': i.precio_unitario ? `Q${Number(i.precio_unitario).toFixed(2)}` : 'N/A', 
                Proveedor: i.proveedor || 'N/A', Stock: i.stock_actual
              })) : movimientos.map(m => ({
                Fecha: new Date(m.fecha).toLocaleString('es-ES'), Tipo: m.tipo.toUpperCase(), 
                Item: m.item?.nombre, Cantidad: m.cantidad, 'Area/Depto': m.departamento || 'N/A', 
                Empleado: m.empleado ? `${m.empleado.nombre} ${m.empleado.apellido}` : 'N/A', Notas: m.notas || ''
              }));
              
              const nombreFinal = adminSede ? `Reporte_${tab === 'catalogo' ? 'Inventario' : tab === 'casos_especiales' ? 'CasosEspeciales' : 'Movimientos'}-SEDE_${adminSede}` : `Reporte_${tab === 'catalogo' ? 'Inventario' : tab === 'casos_especiales' ? 'CasosEspeciales' : 'Movimientos'}`;
              const fileName = `${nombreFinal}-${getTodayStr()}`;

              if (resumenData && resumenData.length > 0) {
                exportToExcel({
                  'Datos': dataExportar,
                  'Resumen_Categorias': resumenData
                }, fileName);
              } else {
                exportToExcel(dataExportar, fileName);
              }
            }}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            📊 Excel
          </button>
          
          <button
            onClick={() => {
              let resumenData: any[] | undefined = undefined;
              if (tab === 'catalogo' || tab === 'casos_especiales') {
                resumenData = categoriasUnicas.map(cat => {
                  const itemsCat = itemsFiltrados.filter(i => i.categoria === cat);
                  const articulos = itemsCat.reduce((acc, i) => acc + (Number(i.stock_actual) || 0), 0);
                  const totalValor = itemsCat.reduce((acc, i) => acc + ((Number(i.stock_actual) || 0) * (Number(i.precio_unitario) || 0)), 0);
                  return { Categoria: cat, Articulos: articulos, Valor: `Q${totalValor.toFixed(2)}`, rawValor: totalValor };
                });
                const totalArt = resumenData.reduce((acc, r) => acc + r.Articulos, 0);
                const totalVal = resumenData.reduce((acc, r) => acc + r.rawValor, 0);
                resumenData.push({ Categoria: 'TOTAL GENERAL', Articulos: totalArt, Valor: `Q${totalVal.toFixed(2)}` });
                resumenData.forEach(r => delete r.rawValor);
                exportarPDF(
                  ['Sede', 'Nombre', 'Categoría', 'Talla/Unidad', 'Género', 'Área', 'Precio Unit.', 'Stock'],
                  itemsFiltrados.map(i => [i.sede, i.nombre, i.categoria, i.talla_o_medida || 'N/A', i.genero || 'N/A', i.area_asignada || 'General', i.precio_unitario ? `Q${Number(i.precio_unitario).toFixed(2)}` : 'N/A', i.stock_actual.toString()]),
                  tab === 'casos_especiales' ? 'Reporte Inventario - Casos Especiales' : 'Reporte de Inventario', adminSede, resumenData
                );
              } else {
                exportarPDF(
                  ['Fecha', 'Tipo', 'Ítem', 'Cantidad', 'Área/Depto', 'Empleado', 'Notas'],
                  movimientos.map(m => [
                    new Date(m.fecha).toLocaleString('es-ES'), m.tipo.toUpperCase(), m.item?.nombre || 'N/A', 
                    m.cantidad.toString(), m.departamento || 'N/A', m.empleado ? `${m.empleado.nombre} ${m.empleado.apellido}` : 'N/A', m.notas || ''
                  ]),
                  'Reporte de Movimientos', adminSede
                );
              }
            }}
            className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            📕 PDF
          </button>

          <button
            onClick={() => { setItemEditando(null); setIsNuevoItemOpen(true); }}
            className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Ítem
          </button>
        </div>
      </div>

      {/* METRICAS KPI COMPACTAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div 
          onClick={() => setFiltroStock('todos')}
          className={`bg-white px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer shadow-2xs ${filtroStock === 'todos' ? 'border-[#1E3A8A] bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Físico / Catálogo</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-black text-slate-900">{totalFisico}</span>
            <span className="text-[11px] font-bold text-slate-500">unids. / {totalItems} ítems</span>
          </div>
        </div>

        <div 
          onClick={() => setFiltroStock(filtroStock === 'bajo' ? 'todos' : 'bajo')}
          className={`bg-white px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer shadow-2xs ${filtroStock === 'bajo' ? 'border-amber-500 bg-amber-50/20' : 'border-slate-200 hover:border-amber-300'}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block">Stock Bajo (1-5)</span>
            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">Alerta</span>
          </div>
          <span className="text-xl font-black text-amber-600 mt-0.5 block">{stockBajo}</span>
        </div>

        <div 
          onClick={() => setFiltroStock(filtroStock === 'sin_stock' ? 'todos' : 'sin_stock')}
          className={`bg-white px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer shadow-2xs ${filtroStock === 'sin_stock' ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 hover:border-rose-300'}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest block">Sin Stock (Agotado)</span>
            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase">Crítico</span>
          </div>
          <span className="text-xl font-black text-rose-600 mt-0.5 block">{sinStock}</span>
        </div>

        <div className="bg-white px-4 py-3 rounded-2xl border-2 border-slate-200 shadow-2xs">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Valor Estimado Catálogo</span>
          <span className="text-xl font-black text-emerald-800 mt-0.5 block">Q{valorTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* PANEL DE FILTROS DESPLEGABLES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div>
            <label htmlFor="inv-filter-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">🔍 Buscar Ítem</label>
            <input
              id="inv-filter-name"
              type="text"
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-slate-50/50"
              placeholder="Ej. Chaleco, Lapicero..."
            />
          </div>

          <div>
            <label htmlFor="inv-filter-cat" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Categoría</label>
            <select
              id="inv-filter-cat"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-white"
            >
              <option value="">Todas las Categorías</option>
              {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="inv-filter-area" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Área / Nivel</label>
            <select
              id="inv-filter-area"
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-white"
            >
              <option value="">Todas las Áreas</option>
              {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="inv-filter-prov" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Proveedor</label>
            <select
              id="inv-filter-prov"
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-white"
            >
              <option value="">Todos los Proveedores</option>
              {proveedoresUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="inv-filter-talla" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Talla / Medida</label>
            <input
              id="inv-filter-talla"
              type="text"
              value={filtroTalla}
              onChange={(e) => setFiltroTalla(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-slate-50/50"
              placeholder="Ej. S, M, XL..."
            />
          </div>

          <div>
            <label htmlFor="inv-filter-genero" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Género</label>
            <select
              id="inv-filter-genero"
              value={filtroGenero}
              onChange={(e) => setFiltroGenero(e.target.value)}
              className="w-full h-10 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-white"
            >
              <option value="">Todos</option>
              {generosUnicos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* PESTAÑA NAVEGACIÓN MODERNA */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setTab('catalogo')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${tab === 'catalogo' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          📦 Catálogo & Stock General
        </button>
        <button
          onClick={() => setTab('casos_especiales')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${tab === 'casos_especiales' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'}`}
        >
          ⭐ Casos Especiales {items.filter(i => i.categoria === 'Casos Especiales' || i.area_asignada === 'Casos Especiales' || (i.nombre && i.nombre.toLowerCase().includes('especial'))).length > 0 && `(${items.filter(i => i.categoria === 'Casos Especiales' || i.area_asignada === 'Casos Especiales' || (i.nombre && i.nombre.toLowerCase().includes('especial'))).length})`}
        </button>
        <button
          onClick={() => setTab('movimientos')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${tab === 'movimientos' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          📜 Historial de Entregas & Movimientos
        </button>
      </div>

      {/* RENDERIZADO DE TABLAS */}
      {cargando ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#1E3A8A]"></div>
        </div>
      ) : tab === 'catalogo' || tab === 'casos_especiales' ? (
        <div className="glass-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                {tab === 'casos_especiales' ? (
                  <tr>
                    <th className="py-2.5 px-3 pl-4">👕 Prenda & Talla</th>
                    <th className="py-2.5 px-3">👤 Titular Original (Para quién era)</th>
                    <th className="py-2.5 px-3">📝 Motivo del Caso Especial / Devolución</th>
                    {!adminSede && <th className="py-2.5 px-3">Sede</th>}
                    <th className="py-2.5 px-3">Stock Dispon.</th>
                    <th className="py-2.5 px-3 pr-4 text-right">Acciones de Reasignación</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="py-2.5 px-3 pl-4">Ítem / Artículo</th>
                    <th className="py-2.5 px-3">Detalle & Categoría</th>
                    {!adminSede && <th className="py-2.5 px-3">Sede</th>}
                    <th className="py-2.5 px-3">Stock</th>
                    <th className="py-2.5 px-3 pr-4 text-right">Acciones Rápidas</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      {tab === 'casos_especiales' ? (
                        <div className="space-y-3">
                          <p className="text-amber-800 font-bold text-sm">No hay prendas registradas en el Inventario de Casos Especiales.</p>
                          <p className="text-slate-500 text-xs font-normal max-w-md mx-auto">
                            Registra aquí prendas de personal que no superó el período de prueba o canceló uniformes para tenerlas listas y <strong>reasignarlas a nuevos funcionarios</strong>.
                          </p>
                          <button
                            onClick={() => {
                              setItemEditando({ area_asignada: 'Casos Especiales', categoria: 'Casos Especiales' });
                              setIsNuevoItemOpen(true);
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                          >
                            + Registrar Prenda en Casos Especiales
                          </button>
                        </div>
                      ) : (
                        'No se encontraron ítems con los filtros seleccionados.'
                      )}
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map((item) => {
                    const rawDesc = item.descripcion || '';
                    const matchPara = rawDesc.match(/\[PARA:\s*([^\]]+)\]/i);
                    const matchMotivo = rawDesc.match(/\[MOTIVO:\s*([^\]]+)\]/i);
                    const empOriginal = matchPara ? matchPara[1].trim() : 'No especificado';
                    const motivoEspecial = matchMotivo ? matchMotivo[1].trim() : (rawDesc.replace(/\[PARA:.*?\]/gi, '').replace(/\[MOTIVO:.*?\]/gi, '').trim() || 'Prenda en stock especial');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {tab === 'casos_especiales' ? (
                          <>
                            <td className="py-2.5 px-3 pl-4">
                              <p className="font-bold text-slate-900 text-xs">{item.nombre}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {item.talla_o_medida && (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    {item.talla_o_medida}
                                  </span>
                                )}
                                {item.genero && item.genero !== 'N/A' && (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700">
                                    {item.genero}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-800">
                              <p className="font-bold text-slate-900 text-xs">{empOriginal}</p>
                              {item.precio_unitario > 0 && <p className="text-[10px] text-slate-400">Valor ref: Q{Number(item.precio_unitario).toFixed(2)}</p>}
                            </td>
                            <td className="p-3.5 text-slate-700">
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/60">
                                📝 {motivoEspecial}
                              </span>
                            </td>
                            {!adminSede && (
                              <td className="p-3.5">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${item.sede === 'ROOS' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {item.sede}
                                </span>
                              </td>
                            )}
                            <td className="p-3.5">
                              <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 rounded-xl text-xs font-bold ${
                                item.stock_actual === 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {item.stock_actual} disp.
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setMovModalConfig({ isOpen: true, item, tipo: 'salida' })}
                                  disabled={item.stock_actual === 0}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors disabled:opacity-40 flex items-center gap-1"
                                >
                                  🔄 Reasignar a Funcionario
                                </button>
                                <button
                                  onClick={() => { setItemEditando(item); setIsNuevoItemOpen(true); }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 pl-4">
                              <p className="font-bold text-slate-900 text-xs">{item.nombre}</p>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#1E3A8A]/10 text-[#1E3A8A]">
                                {item.categoria}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {item.talla_o_medida && <p><span className="font-bold text-slate-500">Talla/Medida:</span> {item.talla_o_medida}</p>}
                              {item.genero && item.genero !== 'N/A' && <p><span className="font-bold text-slate-500">Género:</span> {item.genero}</p>}
                              {item.area_asignada && <p><span className="font-bold text-slate-500">Área:</span> {item.area_asignada}</p>}
                              {item.precio_unitario > 0 && <p><span className="font-bold text-slate-500">Precio Unit.:</span> Q{Number(item.precio_unitario).toFixed(2)}</p>}
                              {item.proveedor && <p><span className="font-bold text-slate-500">Proveedor:</span> {item.proveedor}</p>}
                            </td>
                            {!adminSede && (
                              <td className="p-3.5">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${item.sede === 'ROOS' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {item.sede}
                                </span>
                              </td>
                            )}
                            <td className="p-3.5">
                              <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 rounded-xl text-xs font-bold ${
                                item.stock_actual === 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                item.stock_actual <= 5 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {item.stock_actual}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setMovModalConfig({ isOpen: true, item, tipo: 'salida' })}
                                  disabled={item.stock_actual === 0}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-lg border border-blue-100 transition-colors disabled:opacity-40"
                                >
                                  📦 Entregar a Funcionario
                                </button>
                                <button
                                  onClick={() => setMovModalConfig({ isOpen: true, item, tipo: 'entrada' })}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-100 transition-colors"
                                >
                                  + Entrada
                                </button>
                                <button
                                  onClick={() => { setItemEditando(item); setIsNuevoItemOpen(true); }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE MOVIMIENTOS Y ENTREGAS CON VALES */
        <div className="glass-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Fecha & Hora</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Ítem</th>
                  <th className="p-3.5">Cantidad</th>
                  <th className="p-3.5">Receptor / Departamento</th>
                  <th className="p-3.5 text-right">Vale de Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      No hay registros recientes de entrega o movimiento.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-slate-600 font-mono">
                        {new Date(mov.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          mov.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {mov.tipo === 'entrada' ? '📥 ENTRADA' : '📦 ENTREGA'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{mov.item?.nombre}</td>
                      <td className="p-3.5 font-bold text-slate-900">{mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}</td>
                      <td className="p-3.5 text-slate-600">
                        {mov.empleado ? (
                          <p className="font-bold text-slate-900">{mov.empleado.nombre} {mov.empleado.apellido}</p>
                        ) : (
                          <p className="text-slate-400 italic">Movimiento Interno</p>
                        )}
                        {mov.departamento && <p className="text-[10px] text-slate-400">Área: {mov.departamento}</p>}
                      </td>
                      <td className="p-3.5 text-right">
                        {(() => {
                          const notasText = mov.notas || '';
                          const hasFirma = notasText.includes('|FIRMA_DIGITAL|');
                          const visibleNotas = hasFirma ? notasText.split('|FIRMA_DIGITAL|')[0] : notasText;
                          const firmaBase64 = hasFirma ? notasText.split('|FIRMA_DIGITAL|')[1] : undefined;

                          return mov.tipo === 'salida' && mov.empleado ? (
                            <button
                              onClick={() => generarValeEntrega({ ...mov, notas: visibleNotas }, adminSede || 'ROOS', firmaBase64)}
                              className="px-3 py-1.5 bg-[#1E3A8A]/10 hover:bg-[#1E3A8A]/20 text-[#1E3A8A] font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 ml-auto"
                            >
                              📄 Descargar Vale PDF
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">N/A</span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ModalNuevoItem
        isOpen={isNuevoItemOpen}
        onClose={() => { setIsNuevoItemOpen(false); setItemEditando(null); }}
        onCrear={handleCrearItem}
        sedeActual={adminSede}
        itemEdit={itemEditando}
      />
      
      <ModalMovimiento
        isOpen={movModalConfig.isOpen}
        item={movModalConfig.item}
        tipo={movModalConfig.tipo}
        onClose={() => setMovModalConfig({ ...movModalConfig, isOpen: false })}
        onRegistrar={handleRegistrarMovimiento}
      />
    </div>
  );
}
