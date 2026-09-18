'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Empleado } from '@/types';
import { generarImagenQRDataUrl, generarCodigoQR } from '@/lib/qrCode';
import { empleadosService } from '@/lib/supabase';

interface CarnetDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: Empleado | null;
  empleadosLista?: Empleado[];
}

export default function CarnetDigitalModal({ isOpen, onClose, empleado, empleadosLista }: CarnetDigitalModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [batchQrUrls, setBatchQrUrls] = useState<{ [id: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const esMasivo = Boolean(empleadosLista && empleadosLista.length > 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (esMasivo && empleadosLista) {
      setLoading(true);
      const promises = empleadosLista.map(async (emp) => {
        let code = emp.qr_code;
        if (!code) {
          code = generarCodigoQR();
          // Guardar permanentemente en base de datos
          empleadosService.update(emp.id, { qr_code: code }).catch(console.error);
        }
        const url = await generarImagenQRDataUrl(code);
        return { id: emp.id, url };
      });

      Promise.all(promises)
        .then(results => {
          const map: { [id: string]: string } = {};
          results.forEach(r => { map[r.id] = r.url; });
          setBatchQrUrls(map);
        })
        .catch(err => console.error('Error generando QR masivos:', err))
        .finally(() => setLoading(false));
    } else if (empleado) {
      setLoading(true);
      let code = empleado.qr_code;
      if (!code) {
        code = generarCodigoQR();
        // Guardar permanentemente en base de datos
        empleadosService.update(empleado.id, { qr_code: code }).catch(console.error);
      }
      generarImagenQRDataUrl(code)
        .then(url => {
          setQrDataUrl(url);
        })
        .catch(err => console.error('Error al generar código QR:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, empleado, empleadosLista, esMasivo]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;
  if (!esMasivo && !empleado) return null;

  const handleDescargar = () => {
    if (!qrDataUrl || !empleado) return;
    const link = document.createElement('a');
    link.download = `Carnet_${empleado.nombre}_${empleado.apellido}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleImprimirMasivo = () => {
    if (!cardRef.current && !esMasivo) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    let contentHtml = '';
    if (esMasivo && empleadosLista) {
      contentHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          ${empleadosLista.map(e => `
            <div style="border: 2px solid #1E3A8A; border-radius: 12px; padding: 15px; text-align: center; font-family: sans-serif; page-break-inside: avoid; background: white;">
              <h3 style="margin: 0; color: #1E3A8A; font-size: 11px; text-transform: uppercase; font-weight: 800;">Colegio Manos a la Obra</h3>
              <p style="margin: 2px 0 8px 0; font-size: 9px; color: #64748B;">Credencial Oficial de Acceso</p>
              ${e.foto_url ? `<img src="${e.foto_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 4px auto; border: 2px solid #1E3A8A;" />` : ''}
              <h2 style="margin: 4px 0 2px 0; font-size: 13px; color: #0F172A;">${e.nombre} ${e.apellido}</h2>
              <p style="margin: 0 0 6px 0; font-size: 10px; color: #2563EB; font-weight: bold;">${e.cargo || 'Funcionario'}</p>
              <img src="${batchQrUrls[e.id]}" style="width: 110px; height: 110px; margin: 4px auto;" />
              <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 10px; color: #475569; font-weight: bold;">${e.qr_code || 'EMPL-OFFICIAL'}</p>
            </div>
          `).join('')}
        </div>
      `;
    } else if (empleado) {
      contentHtml = `
        <div style="border: 2px solid #1E3A8A; border-radius: 16px; padding: 24px; text-align: center; font-family: sans-serif; max-width: 320px; margin: 0 auto; background: white;">
          <h3 style="margin: 0; color: #1E3A8A; font-size: 13px; text-transform: uppercase; font-weight: 800;">Colegio Manos a la Obra</h3>
          <p style="margin: 2px 0 12px 0; font-size: 10px; color: #64748B;">Credencial Única de Acceso</p>
          ${empleado.foto_url ? `<img src="${empleado.foto_url}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin: 8px auto; border: 3px solid #1E3A8A;" />` : ''}
          <h2 style="margin: 8px 0 2px 0; font-size: 16px; color: #0F172A;">${empleado.nombre} ${empleado.apellido}</h2>
          <p style="margin: 0 0 12px 0; font-size: 11px; color: #2563EB; font-weight: bold;">${empleado.cargo || 'Funcionario'}</p>
          <img src="${qrDataUrl}" style="width: 140px; height: 140px; margin: 8px auto;" />
          <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 11px; color: #475569; font-weight: bold;">${empleado.qr_code || 'EMPL-OFFICIAL'}</p>
        </div>
      `;
    }

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Carnets QR</title>
          <style>
            .photo-placeholder { width: 75px; height: 75px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 10px; }
            .name { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
            .cargo { font-size: 11px; color: #2563eb; font-weight: 600; margin: 4px 0 10px; }
            .qr { width: 160px; height: 160px; margin: 10px auto; display: block; }
            .code { font-family: monospace; font-size: 13px; font-weight: 800; color: #1E3A8A; letter-spacing: 2px; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; display: inline-block; }
            .footer { margin-top: 12px; font-size: 8px; color: #94a3b8; text-transform: uppercase; }
            @media print { body { background: white; padding: 0; } .card { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div>
            ${contentHtml}
          </div>
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Eliminar el iframe después de imprimir
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 10000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className={`bg-white w-full ${esMasivo ? 'max-w-4xl' : 'max-w-xl'} rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col`}>
        
        {/* Encabezado Modal */}
        <div className="px-6 py-4 bg-[#1E3A8A] text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {esMasivo ? `Carnets QR por Lote (${empleadosLista?.length} Funcionarios)` : 'Carnet Digital Generado'}
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">Credenciales oficiales para marcaje biométrico</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vista Previa del Carnet / Lote */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent animate-spin rounded-full mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">Generando códigos QR vectorizados en alta resolución...</p>
            </div>
          ) : esMasivo && empleadosLista ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {empleadosLista.map((emp) => (
                <div key={emp.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-[#1E3A8A] uppercase tracking-wider block">Colegio Manos a la Obra</span>
                    {emp.foto_url && (
                      <img src={emp.foto_url} alt={emp.nombre} className="w-12 h-12 rounded-full object-cover mx-auto my-1.5 border-2 border-[#1E3A8A]" />
                    )}
                    <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1">{emp.nombre} {emp.apellido}</h4>
                    <p className="text-[9px] text-blue-600 font-semibold line-clamp-1">{emp.cargo || 'Funcionario'}</p>
                  </div>
                  {batchQrUrls[emp.id] && (
                    <img src={batchQrUrls[emp.id]} alt="QR" className="w-24 h-24 mx-auto my-1.5 rounded-lg bg-white p-1 border border-slate-200" />
                  )}
                  <div className="inline-block bg-[#1E3A8A]/10 text-[#1E3A8A] font-mono font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mx-auto">
                    {emp.qr_code || 'EMPL-OFFICIAL'}
                  </div>
                </div>
              ))}
            </div>
          ) : empleado ? (
            <div className="flex flex-col items-center py-2">
              <div ref={cardRef} className="w-full max-w-[300px] bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-[#1E3A8A] rounded-2xl p-5 shadow-md text-center">
                <div className="border-b border-slate-200 pb-2 mb-3">
                  <span className="text-xs font-black text-[#1E3A8A] uppercase tracking-wider block">Colegio Manos a la Obra</span>
                  <span className="text-[9px] text-slate-500 font-medium">Credencial Única de Acceso</span>
                </div>

                {empleado.foto_url && (
                  <img src={empleado.foto_url} alt={empleado.nombre} className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-[#1E3A8A] shadow-sm" />
                )}

                <h4 className="text-sm font-bold text-slate-900 leading-tight">{empleado.nombre} {empleado.apellido}</h4>
                <p className="text-[11px] font-semibold text-blue-600 mt-0.5">{empleado.cargo || 'Funcionario'} • {empleado.departamento || 'General'}</p>

                <img src={qrDataUrl} alt="Código QR" className="w-40 h-40 mx-auto my-2 rounded-lg bg-white p-2 border border-slate-200 shadow-sm" />

                <div className="inline-block bg-[#1E3A8A]/10 text-[#1E3A8A] font-mono font-bold text-xs px-3 py-0.5 rounded-md tracking-widest mt-0.5">
                  {empleado.qr_code || 'EMPL-OFFICIAL'}
                </div>
                
                <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Sede: {empleado.sede || 'ROOS'}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Botones de acción */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0 z-10">
          {!esMasivo && empleado && (
            <button
              onClick={handleDescargar}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-all border border-slate-200 shadow-xs"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
          )}

          <button
            onClick={handleImprimirMasivo}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {esMasivo ? `Imprimir Lote (${empleadosLista?.length} Carnets)` : 'Imprimir Carnet'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
