'use client';

import Link from 'next/link';

export default function PoliticasPrivacidadPage() {
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
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Política de Privacidad y Datos Biométricos</h1>
              <p className="text-sm text-blue-300/80 font-medium mt-1">Colegio Manos a la Obra • Sistema RRHH</p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-5 flex items-start gap-4">
            <svg className="w-6 h-6 text-[#1E3A8A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-900 font-semibold leading-relaxed">
              Esta política describe cómo el <strong>Colegio Manos a la Obra</strong> recopila, utiliza, resguarda y protege la información personal, datos biométricos y evidencias de marcaje de los funcionarios.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">1. Datos Recopilados y Procesados</h2>
            <p>
              Para garantizar la autenticidad del registro de asistencia escolar e institucional, el sistema recopila los siguientes datos:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
              <li><strong>Datos de Identificación:</strong> Nombre, apellidos, número de cédula, departamento, cargo y sede de trabajo.</li>
              <li><strong>Vectores Biométricos Faciales:</strong> Representación matemática encriptada (vector de 128 dimensiones) extraído durante el enrolamiento facial. No se almacenan plantillas propietarias ni imágenes crudas no autorizadas.</li>
              <li><strong>Fotografías de Evidencia Silenciosa:</strong> Captura fotográfica instantánea tomada automáticamente en la estación de kiosco al momento de validar la coincidencia del rostro.</li>
              <li><strong>Registros Horarios:</strong> Timestamp de fecha, hora de entrada/salida, estación de marcaje e identificación del dispositivo.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">2. Finalidad del Tratamiento de Datos</h2>
            <p>
              Toda la información capturada tiene la <strong>finalidad exclusiva de:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
              <li>Verificar la presencia y puntualidad de los colaboradores en las sedes institucionales.</li>
              <li>Evitar la suplantación de identidad mediante la verificación biométrica 1:1.</li>
              <li>Servir de auditoría respaldada para Recursos Humanos mediante la consulta de fotografías de evidencia.</li>
              <li>Generación de reportes operativos de puntualidad, ausentismo y cálculo de justificaciones.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">3. Seguridad y Almacenamiento Encriptado</h2>
            <p className="text-slate-600 font-medium">
              Los datos biométricos y fotografías de evidencia se almacenan utilizando conexiones cifradas TLS/SSL en servidores con Row Level Security (RLS) en Supabase Cloud. El acceso a las evidencias fotográficas está restringido únicamente al personal autorizado del área de Recursos Humanos y Dirección.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">4. Conservación y Derechos ARCO</h2>
            <p className="text-slate-600 font-medium">
              Los registros de asistencia se conservarán durante el período establecido por las políticas institucionales y la normativa laboral vigente. Los funcionarios pueden solicitar la revisión o actualización de sus datos personales a través del departamento de Recursos Humanos.
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
