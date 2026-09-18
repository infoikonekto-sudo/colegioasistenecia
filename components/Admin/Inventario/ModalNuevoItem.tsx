'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCatalogos } from '@/hooks/useCatalogos';
import { ComboboxField } from './ComboboxField';

const prendasOpciones = ['Polo', 'Polo/ Blanca', 'Polo/ Azul', 'Polo/ Amarilla', 'Chaleco', 'Chumpa con guata/ forro polar', 'Chumpa con guata/ forro dryfit', 'Chumpa sin guata - con forro polar', 'Chumpa sin guata - con forro dryfit', 'Blusa manga corta -Regular / Azul', 'Blusa manga larga-Regular / Azul', 'Blusa manga corta -Tallado / Azul', 'Blusa manga larga-Tallado /Azul', 'Camisa manga corta -Regular /Azul', 'Camisa manga larga-Regular /Azul', 'Blusa manga corta -Regular / Blanco', 'Blusa manga larga-Regular / Blanco', 'Blusa manga corta -Tallado / Blanco', 'Blusa manga larga-Tallado / Blanco', 'Camisa manga corta -Regular / Blanco', 'Camisa manga larga-Regular / Blanco'];
const areasOpciones = ['Preprimaria', 'Primaria', 'Secundaria', 'Administrativo', 'General', 'Casos Especiales'];
const tallasOpciones = ['14', 'XS (16)', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'Única'];
const preciosOpciones = [135, 155, 173, 175, 195, 198, 215, 235, 290, 310, 330, 335, 350, 355, 375, 395];
const proveedoresOpciones = ['Adicción a los Deportes (Spadd)', 'Industrias R & E'];

interface ModalNuevoItemProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (item: any) => Promise<void>;
  sedeActual: string | null;
  itemEdit?: any | null;
}

export default function ModalNuevoItem({ isOpen, onClose, onCrear, sedeActual, itemEdit = null }: ModalNuevoItemProps) {
  const { departamentos: areasGlob, cargos: categoriasGlob } = useCatalogos();
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    tipo_unidad: 'Unidades',
    aplica_talla: false,
    talla: '',
    proveedor: '',
    descripcion: '',
    empleado_original: '',
    motivo_especial: '',
    stock_actual: 0,
    precio_unitario: 0,
    sede: sedeActual || 'ROOS',
    area_asignada: 'General',
    genero: 'N/A'
  });
  const [guardando, setGuardando] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (itemEdit) {
        let aplica_talla = false;
        let tipo_unidad = 'Unidades';
        let talla_solo = '';
        const tallaStr = itemEdit.talla_o_medida || '';
        
        if (tallaStr.includes(' - Talla ')) {
          aplica_talla = true;
          const partes = tallaStr.split(' - Talla ');
          tipo_unidad = partes[0] || 'Unidades';
          talla_solo = partes[1] || '';
        } else {
          tipo_unidad = tallaStr || 'Unidades';
        }

        const rawDesc = itemEdit.descripcion || '';
        let empOrig = '';
        let motEsp = '';
        
        const matchPara = rawDesc.match(/\[PARA:\s*([^\]]+)\]/i);
        if (matchPara) empOrig = matchPara[1].trim();

        const matchMotivo = rawDesc.match(/\[MOTIVO:\s*([^\]]+)\]/i);
        if (matchMotivo) motEsp = matchMotivo[1].trim();

        const cleanDesc = rawDesc.replace(/\[PARA:.*?\]/gi, '').replace(/\[MOTIVO:.*?\]/gi, '').trim();

        setFormData({
          nombre: itemEdit.nombre || '',
          categoria: itemEdit.categoria || '',
          tipo_unidad: tipo_unidad,
          aplica_talla: aplica_talla,
          talla: talla_solo,
          proveedor: itemEdit.proveedor || '',
          descripcion: cleanDesc,
          empleado_original: empOrig,
          motivo_especial: motEsp,
          stock_actual: itemEdit.stock_actual || 0,
          precio_unitario: itemEdit.precio_unitario || 0,
          sede: itemEdit.sede || sedeActual || 'ROOS',
          area_asignada: itemEdit.area_asignada || 'General',
          genero: itemEdit.genero || 'N/A'
        });
      } else {
        setFormData({
          nombre: '', categoria: '', tipo_unidad: 'Prendas', aplica_talla: false, talla: '', 
          proveedor: '', descripcion: '', empleado_original: '', motivo_especial: '', stock_actual: 1, precio_unitario: 0, 
          sede: sedeActual || 'ROOS', area_asignada: 'Casos Especiales', genero: 'N/A'
        });
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, itemEdit, sedeActual]);

  if (!isOpen || !isMounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    
    // Preparar el campo talla_o_medida combinado
    let tallaFinal = formData.tipo_unidad;
    if (formData.aplica_talla && formData.talla.trim() !== '') {
      tallaFinal = `${formData.tipo_unidad} - Talla ${formData.talla}`;
    }

    let finalDesc = formData.descripcion;
    const metaParts = [];
    if (formData.empleado_original.trim()) metaParts.push(`[PARA: ${formData.empleado_original.trim()}]`);
    if (formData.motivo_especial.trim()) metaParts.push(`[MOTIVO: ${formData.motivo_especial.trim()}]`);
    
    if (metaParts.length > 0) {
      finalDesc = `${metaParts.join(' ')} ${finalDesc}`.trim();
    }

    const itemData = {
      ...(itemEdit && { id: itemEdit.id }),
      nombre: formData.nombre,
      categoria: formData.categoria || (formData.area_asignada === 'Casos Especiales' ? 'Casos Especiales' : 'Uniformes'),
      talla_o_medida: tallaFinal,
      proveedor: formData.proveedor,
      descripcion: finalDesc,
      stock_actual: formData.stock_actual,
      precio_unitario: formData.precio_unitario,
      sede: formData.sede,
      area_asignada: formData.area_asignada,
      genero: formData.genero
    };

    await onCrear(itemData);
    setGuardando(false);
  };

  const title = itemEdit ? 'Editar Ítem de Inventario' : 'Nuevo Ítem de Inventario';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col my-auto max-h-[85vh] overflow-hidden border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
            <ComboboxField
              label="Nombre del Ítem"
              value={formData.nombre}
              onChange={(val: string) => setFormData({ ...formData, nombre: val })}
              options={prendasOpciones}
              placeholder="Ej. Uniforme Talla M"
              required={true}
              colSpan={2}
            />

            <ComboboxField
              label="Categoría"
              value={formData.categoria}
              onChange={(val: string) => setFormData({ ...formData, categoria: val })}
              options={categoriasGlob}
              placeholder="Ej. Uniformes..."
              required={true}
            />

            <div className="space-y-1.5">
              <label htmlFor="item-sede" className="text-xs font-bold text-slate-600 uppercase">Sede Asignada</label>
              <select
                id="item-sede"
                value={formData.sede}
                onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                disabled={!!sedeActual}
              >
                <option value="ROOS">Sede Roosevelt</option>
                <option value="CAES">Sede Carr. El Salvador</option>
              </select>
            </div>

            <ComboboxField
              label="Área Asignada"
              value={formData.area_asignada}
              onChange={(val: string) => setFormData({ ...formData, area_asignada: val })}
              options={Array.from(new Set([...areasOpciones, ...areasGlob]))}
              placeholder="Ej. General, Deportes..."
            />

            <div className="space-y-1.5">
              <label htmlFor="item-unidad" className="text-xs font-bold text-slate-600 uppercase">Tipo de Unidad</label>
              <select
                id="item-unidad"
                required
                value={formData.tipo_unidad}
                onChange={(e) => setFormData({ ...formData, tipo_unidad: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              >
                <option value="Unidades">Unidades</option>
                <option value="Prendas">Prendas</option>
                <option value="Cajas">Cajas</option>
                <option value="Paquetes">Paquetes</option>
                <option value="Pares">Pares</option>
                <option value="Metros">Metros</option>
                <option value="Litros">Litros</option>
                <option value="Libras">Libras</option>
                <option value="Galones">Galones</option>
                <option value="Rollos">Rollos</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="item-genero" className="text-xs font-bold text-slate-600 uppercase">Género (Prendas)</label>
              <select
                id="item-genero"
                value={formData.genero}
                onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              >
                <option value="N/A">N/A</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-[18px]">
                <label htmlFor="item-aplica-talla" className="text-xs font-bold text-slate-600 uppercase">¿Aplica Talla?</label>
                <input
                  id="item-aplica-talla"
                  type="checkbox"
                  checked={formData.aplica_talla}
                  onChange={(e) => setFormData({ ...formData, aplica_talla: e.target.checked })}
                  className="w-4 h-4 text-navy-600 border-slate-300 rounded focus:ring-navy-500"
                />
              </div>
              <ComboboxField
                label=""
                value={formData.talla}
                onChange={(val: string) => setFormData({ ...formData, talla: val })}
                options={tallasOpciones}
                placeholder="Seleccionar o escribir..."
                disabled={!formData.aplica_talla}
                required={formData.aplica_talla}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="item-stock" className="text-xs font-bold text-slate-600 uppercase">Stock Inicial</label>
              <input
                id="item-stock"
                type="number"
                min="0"
                required
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-mono text-center font-bold"
              />
            </div>

            <ComboboxField
              label="Precio Unit. (Q)"
              value={formData.precio_unitario}
              onChange={(val: number) => setFormData({ ...formData, precio_unitario: val })}
              options={preciosOpciones}
              placeholder="0.00"
              isNumber={true}
            />

            <ComboboxField
              label="Proveedor"
              value={formData.proveedor}
              onChange={(val: string) => setFormData({ ...formData, proveedor: val })}
              options={proveedoresOpciones}
              placeholder="Ej. Distribuidora X"
              colSpan={2}
            />

            {/* SECCIÓN ESPECIAL PARA CASOS ESPECIALES */}
            <div className={`col-span-2 p-3.5 rounded-xl border transition-all ${formData.area_asignada === 'Casos Especiales' || formData.categoria === 'Casos Especiales' ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-amber-600 font-bold text-xs">⭐ Registro de Caso Especial (Prenda Retenida / Devolución)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="item-emp-orig" className="text-[10px] font-bold text-slate-600 uppercase block mb-1">¿Para quién era la prenda originalmente?</label>
                  <input
                    id="item-emp-orig"
                    type="text"
                    value={formData.empleado_original}
                    onChange={(e) => setFormData({ ...formData, empleado_original: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-900 h-10 px-3 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                    placeholder="Ej. Juan Pérez (Ex-empleado)"
                  />
                </div>
                <div>
                  <label htmlFor="item-motivo-esp" className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Motivo de Retorno / Estado</label>
                  <input
                    id="item-motivo-esp"
                    type="text"
                    value={formData.motivo_especial}
                    onChange={(e) => setFormData({ ...formData, motivo_especial: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-900 h-10 px-3 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                    placeholder="Ej. No superó mes de prueba / Talla devuelta"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label htmlFor="item-descripcion" className="text-xs font-bold text-slate-600 uppercase">Observaciones Adicionales (Opc.)</label>
              <textarea
                id="item-descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 resize-none h-16"
                placeholder="Detalles adicionales..."
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
              disabled={guardando}
              className="flex-1 h-11 bg-navy-900 text-white rounded-lg font-bold text-xs hover:bg-navy-800 transition-colors disabled:opacity-50"
            >
              {guardando ? 'GUARDANDO...' : (itemEdit ? 'GUARDAR CAMBIOS' : 'CREAR ÍTEM')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
