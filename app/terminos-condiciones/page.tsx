'use client';

import Link from 'next/link';

export default function TerminosCondicionesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 sm:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-8 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E3A8A] text-white">
          <Link href="/login" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-6 text-sm font-bold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Términos y Condiciones de Uso</h1>
              <p className="text-sm text-blue-300/80 font-medium mt-1">Colegio Manos a la Obra • Sistema RRHH</p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4">
            <svg className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-900 font-semibold leading-relaxed">
              El uso del Kiosco de Marcaje Biométrico y la Plataforma de RRHH implica la aceptación plena e incondicional de los presentes Términos y Condiciones de Uso por parte del funcionario.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">1. Uso Personal e Intransferible del Código QR</h2>
            <p className="text-slate-600 font-medium">
              Cada funcionario es responsable del resguardo de su código QR / carnet digital asignado. Está estrictamente prohibido transferir, fotografiar o prestar el carnet a un tercero para intentar registrar una asistencia ajena.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">2. Consentimiento de Verificación Biométrica y Registro Fotográfico</h2>
            <p>
              Al hacer uso del sistema en la estación de marcaje, el funcionario autoriza expresamente:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
              <li>El procesamiento de sus rasgos faciales mediante sensor de cámara en vivo para la validación 1:1 contra su perfil enrolado.</li>
              <li>La captura fotográfica silenciosa de evidencia instantánea que queda archivada en su expediente de marcaje.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">3. Prohibición de Intentos de Suplantación o Manipulación</h2>
            <p className="text-slate-600 font-medium">
              Cualquier intento de suplantación de identidad (utilizando máscaras, fotografías impresas en dispositivos o carnets ajenos) será detectado por el motor anti-duplicados y la auditoría de evidencias, lo cual constituirá una falta grave sujeta a las sanciones contempladas en el reglamento interno institucional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">4. Modificaciones y Actualizaciones</h2>
            <p className="text-slate-600 font-medium">
              La institución se reserva el derecho de actualizar o modificar los presentes términos para adaptarlos a mejoras tecnológicas o normativas organizacionales. Las versiones vigentes estarán siempre disponibles para su consulta en el sistema.
            </p>
          </section>
        </div>
        
        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-mono">Última actualización: Agosto 2026</p>
        </div>
      </div>
    </div>
  );
}
