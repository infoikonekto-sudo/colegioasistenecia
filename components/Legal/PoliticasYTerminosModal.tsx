'use client';

import { useState } from 'react';

interface PoliticasYTerminosModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacidad' | 'terminos';
}

export default function PoliticasYTerminosModal({
  isOpen,
  onClose,
  defaultTab = 'privacidad'
}: PoliticasYTerminosModalProps) {
  const [activeTab, setActiveTab] = useState<'privacidad' | 'terminos'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* HEADER DEL MODAL */}
        <div className="p-6 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E3A8A] text-white flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide uppercase">Normativa y Protección de Datos</h3>
              <p className="text-xs text-blue-300/80 font-medium">Colegio Manos a la Obra • Sistema RRHH</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('privacidad')}
            className={`px-5 py-2.5 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'privacidad'
                ? 'bg-white text-[#1E3A8A] border-[#1E3A8A] shadow-xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            🔒 Política de Privacidad y Datos Biométricos
          </button>
          <button
            onClick={() => setActiveTab('terminos')}
            className={`px-5 py-2.5 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'terminos'
                ? 'bg-white text-[#1E3A8A] border-[#1E3A8A] shadow-xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            📜 Términos y Condiciones de Uso
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-700 text-sm leading-relaxed font-sans">
          {activeTab === 'privacidad' ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-[#1E3A8A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-900 font-semibold leading-relaxed">
                  Esta política describe cómo el <strong>Colegio Manos a la Obra</strong> recopila, utiliza, resguarda y protege la información personal, datos biométricos y evidencias de marcaje de los funcionarios.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">1. Datos Recopilados y Procesados</h4>
                <p>
                  Para garantizar la autenticidad del registro de asistencia escolar e institucional, el sistema recopila los siguientes datos:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                  <li><strong>Datos de Identificación:</strong> Nombre, apellidos, número de cédula, departamento, cargo y sede de trabajo.</li>
                  <li><strong>Vectores Biométricos Faciales:</strong> Representación matemática encriptada (vector de 128 dimensiones) extraído durante el enrolamiento facial. No se almacenan plantillas propietarias ni imágenes crudas no autorizadas.</li>
                  <li><strong>Fotografías de Evidencia Silenciosa:</strong> Captura fotográfica instantánea tomada automáticamente en la estación de kiosco al momento de validar la coincidencia del rostro.</li>
                  <li><strong>Registros Horarios:</strong> Timestamp de fecha, hora de entrada/salida, estación de marcaje e identificación del dispositivo.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">2. Finalidad del Tratamiento de Datos</h4>
                <p>
                  Toda la información capturada tiene la <strong>finalidad exclusiva de:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                  <li>Verificar la presencia y puntualidad de los colaboradores en las sedes institucionales.</li>
                  <li>Evitar la suplantación de identidad mediante la verificación biométrica 1:1.</li>
                  <li>Servir de auditoría respaldada para Recursos Humanos mediante la consulta de fotografías de evidencia.</li>
                  <li>Generación de reportes operativos de puntualidad, ausentismo y cálculo de justificaciones.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">3. Seguridad y Almacenamiento Encriptado</h4>
                <p>
                  Los datos biométricos y fotografías de evidencia se almacenan utilizando conexiones cifradas TLS/SSL en servidores con Row Level Security (RLS) en Supabase Cloud. El acceso a las evidencias fotográficas está restringido únicamente al personal autorizado del área de Recursos Humanos y Dirección.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">4. Conservación y Derechos ARCO</h4>
                <p>
                  Los registros de asistencia se conservarán durante el período establecido por las políticas institucionales y la normativa laboral vigente. Los funcionarios pueden solicitar la revisión o actualización de sus datos personales a través del departamento de Recursos Humanos.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  El uso del Kiosco de Marcaje Biométrico implica la aceptación plena e incondicional de los presentes Términos y Condiciones de Uso por parte del funcionario.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">1. Uso Personal e Intransferible del Código QR</h4>
                <p>
                  Cada funcionario es responsable del resguardo de su código QR / carnet digital asignado. Está estrictamente prohibido transferir, fotografiar o prestar el carnet a un tercero para intentar registrar una asistencia ajena.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">2. Consentimiento de Verificación Biométrica y Registro Fotográfico</h4>
                <p>
                  Al hacer uso del sistema en la estación de marcaje, el funcionario autoriza expresamente:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                  <li>El procesamiento de sus rasgos faciales mediante sensor de cámara en vivo para la validación 1:1 contra su perfil enrolado.</li>
                  <li>La captura fotográfica silenciosa de evidencia instantánea que queda archivada en su expediente de marcaje.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">3. Prohibición de Intentos de Suplantación o Manipulación</h4>
                <p>
                  Cualquier intento de suplantación de identidad (utilizando máscaras, fotografías impresas en dispositivos o carnets ajenos) será detectado por el motor anti-duplicados y la auditoría de evidencias, lo cual constituirá una falta grave sujeta a las sanciones contempladas en el reglamento interno institucional.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-tight">4. Modificaciones y Actualizaciones</h4>
                <p>
                  La institución se reserva el derecho de actualizar o modificar los presentes términos para adaptarlos a mejoras tecnológicas o normativas organizacionales. Las versiones vigentes estarán siempre disponibles para su consulta en el sistema.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-mono">Última actualización: Agosto 2026</p>
          <button
            onClick={onClose}
            className="bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold text-xs py-2.5 px-6 rounded-2xl transition-all shadow-md uppercase tracking-wider"
          >
            Entendido y Aceptar
          </button>
        </div>

      </div>
    </div>
  );
}
