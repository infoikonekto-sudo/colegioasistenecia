'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { empleadosService } from '@/lib/supabase';
import { useAsistenciaStore } from '@/lib/store';

interface ModalImportarExcelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalImportarExcel({ isOpen, onClose, onSuccess }: ModalImportarExcelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminSede } = useAsistenciaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Obtener datos como arreglo de arreglos (para manejar encabezados en fila 3)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        // El encabezado debería estar en la fila 3 (índice 2) normalmente, pero buscaremos la fila que tenga "Nombre" y "Puesto"
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i] || [];
          const rowStr = row.join(' ').toUpperCase();
          if (rowStr.includes('NOMBRE') && (rowStr.includes('PUESTO') || rowStr.includes('CARGO'))) {
            headerRowIndex = i;
            headers = row.map(h => String(h || '').trim().toUpperCase());
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          // Fallback a fila 3 (índice 2) si no detecta mágicamente
          headerRowIndex = 2;
          headers = (data[2] || []).map(h => String(h || '').trim().toUpperCase());
        }

        // Encontrar índices de columnas dinámicamente según la nueva estructura
        const colArea = headers.findIndex(h => h.includes('ÁREA GENERAL 1') || h.includes('AREA GENERAL 1') || h.includes('DEPARTAMENTO'));
        const colSubarea = headers.findIndex(h => h.includes('SUBÁAREA 2') || h.includes('SUBAREA 2') || h.includes('SUBÁREA 2') || h.includes('SUBAREA'));
        const colNombre = headers.findIndex(h => h.includes('NOMBRE') || h.includes('FUNCIONARIO'));
        const colPuesto = headers.findIndex(h => h.includes('PUESTO GENERAL') || h.includes('CARGO'));
        const colCedula = headers.findIndex(h => h.includes('DPI O CÉDULA') || h.includes('CÉDULA') || h.includes('DPI'));
        const colEmail = headers.findIndex(h => h.includes('CORREO ELECTRÓNICO') || h.includes('CORREO'));
        const colUsuarioInst = headers.findIndex(h => h.includes('USUARIO INSTITUCIONAL'));
        const colSede = headers.findIndex(h => h.includes('CAMPUS ASIGNADO') || h.includes('SEDE'));
        
        const parsedData = [];
        let lastArea = '';
        
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
        const rawArea = colArea !== -1 ? row[colArea] : row[2];
        if (rawArea && String(rawArea).trim() !== '') {
          lastArea = String(rawArea).trim();
        }
        
        let subareaStr = colSubarea !== -1 && row[colSubarea] ? String(row[colSubarea]).trim() : '';
          
          const rawNombre = colNombre !== -1 ? row[colNombre] : row[4];
          if (!rawNombre || String(rawNombre).trim() === '') continue; // Fila vacía
          
          // Separar nombre y apellido (primeros 2 son nombre, el resto apellido)
          const parts = String(rawNombre).trim().split(' ');
          let nombre = String(rawNombre).trim();
          let apellido = '';
          
          if (parts.length >= 3) {
            nombre = parts.slice(0, 2).join(' ');
            apellido = parts.slice(2).join(' ');
          } else if (parts.length === 2) {
            nombre = parts[0];
            apellido = parts[1];
          }
          
          // Logica para determinar la Sede buscando en la columna correspondiente, o toda la fila
          const colSedeValue = colSede !== -1 && row[colSede] ? String(row[colSede]).toUpperCase() : '';
          const rowString = Object.values(row).join(' ').toUpperCase();
          const targetStr = colSedeValue || rowString;
          let sede = 'ROOS'; // Por defecto ROOS
          
          if (
            targetStr.includes('AMBOS') || 
            targetStr.includes('AMBAS') ||
            (targetStr.includes('CAES') && (targetStr.includes('ROOS') || targetStr.includes('ROOSEVELT')))
          ) {
            sede = 'AMBAS';
          } else if (colSedeValue.includes('CAES')) {
            sede = 'CAES';
          } else if (colSedeValue.includes('ROOS') || colSedeValue.includes('ROOSEVELT')) {
            sede = 'ROOS';
          } else if (targetStr.includes('CAES')) {
            sede = 'CAES';
          } else if (targetStr.includes('ROOS') || targetStr.includes('ROOSEVELT')) {
            sede = 'ROOS';
          }
          
          let rawCedula = colCedula !== -1 ? row[colCedula] : row[10];
          let cedulaVal = rawCedula ? String(rawCedula).trim().substring(0, 20) : null;
          if (cedulaVal === '' || (cedulaVal && cedulaVal.toLowerCase() === '(en blanco)')) {
            cedulaVal = null; // Para evitar violaciones de 'unique constraint' con strings vacíos o placeholders
          }
          
          let rawEmail = colEmail !== -1 ? row[colEmail] : row[9];
          let emailVal = rawEmail ? String(rawEmail).substring(0, 50) : null;
          if (emailVal === '' || (emailVal && emailVal.toLowerCase() === '(en blanco)')) {
            emailVal = null;
          }

          if (!nombre || nombre.toUpperCase() === 'VACANTE' || nombre === '(en blanco)') {
            continue; // Saltar las filas vacías o que no son empleados reales
          }

          let cargoStr = colPuesto !== -1 ? row[colPuesto] : row[5];
          
          // Capturar usuario institucional como parte del email si el correo está vacío, o en el nombre (no hay campo en DB)
          let usuarioInst = colUsuarioInst !== -1 && row[colUsuarioInst] ? String(row[colUsuarioInst]).trim() : '';

          parsedData.push({
            nombre: nombre.substring(0, 50),
            apellido: apellido.substring(0, 50),
            departamento: lastArea.substring(0, 50),
            subarea: subareaStr.substring(0, 50),
            cargo: (cargoStr ? String(cargoStr) : '').substring(0, 50),
            sede: sede.substring(0, 50),
            email: emailVal || usuarioInst || null,
            cedula: cedulaVal,
            activo: true
          });
        }
        
        setPreviewData(parsedData);
      } catch (err) {
        console.error(err);
        setError('Error al procesar el archivo. Asegúrate de que tiene el formato correcto.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    
    setLoading(true);
    try {
      // Eliminar duplicados de cédula dentro del mismo Excel para evitar el error de PostgreSQL
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const mapCedulas = new Map();
      const empleadosSinCedula = [];
      
      for (const emp of previewData) {
        if (emp.cedula) {
          mapCedulas.set(emp.cedula, emp);
        } else {
          empleadosSinCedula.push(emp);
        }
      }
      
      const deduplicatedData = [...Array.from(mapCedulas.values()), ...empleadosSinCedula];

      const { error } = await empleadosService.createBulk(deduplicatedData);
      if (error) {
        throw error;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los datos en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col my-auto max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl flex-shrink-0">
          <h3 className="font-bold text-slate-800 text-lg">Carga Masiva de Empleados</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {!file ? (
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-bold text-slate-900">Seleccionar archivo Excel</h3>
              <p className="mt-1 text-xs text-slate-500">Haz clic para buscar tu archivo .xlsx o .xls</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold text-sm">Archivo cargado: {file.name}</span>
                  <span className="text-xs ml-2 opacity-80">({previewData.length} empleados encontrados)</span>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreviewData([]); setError(''); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                >
                  Cambiar archivo
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg border border-rose-100 text-sm font-medium">
                  {error}
                </div>
              )}

              {previewData.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">Nombre</th>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">DPI / Cédula</th>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">Área / Depto</th>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">Puesto</th>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">Correo / Usuario</th>
                          <th className="px-4 py-2 font-bold text-slate-600 uppercase tracking-wider">Campus Asignado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewData.slice(0, 100).map((emp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <span className="font-bold">{emp.nombre}</span> {emp.apellido}
                            </td>
                            <td className="px-4 py-2 font-mono text-slate-600">{emp.cedula || '---'}</td>
                            <td className="px-4 py-2 text-slate-600">{emp.departamento}</td>
                            <td className="px-4 py-2 text-slate-600">{emp.cargo}</td>
                            <td className="px-4 py-2 text-slate-600">{emp.email || '---'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                emp.sede === 'ROOS' ? 'bg-blue-100 text-blue-700' :
                                emp.sede === 'CAES' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {emp.sede}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewData.length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                      Mostrando los primeros 100 registros de {previewData.length} en total.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 h-10 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            CANCELAR
          </button>
          <button
            type="button"
            disabled={!file || previewData.length === 0 || loading}
            onClick={handleImport}
            className="px-6 h-10 bg-navy-600 text-white rounded-lg font-bold text-xs hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                GUARDANDO...
              </>
            ) : (
              `IMPORTAR ${previewData.length} EMPLEADOS`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
