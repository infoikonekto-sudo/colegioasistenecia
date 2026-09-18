'use client';

import { useState, useEffect } from 'react';
import { empleadosService } from '@/lib/supabase';
import Link from 'next/link';
import { useAsistenciaStore } from '@/lib/store';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    presentes: 0,
    ausentes: 0,
    pendientes: 0
  });
  const { adminSede } = useAsistenciaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await empleadosService.getAll(adminSede || undefined);
      if (data) {
        const total = data.length;
        const pendientes = data.filter(e => !e.face_descriptor || (Array.isArray(e.face_descriptor) && e.face_descriptor.length === 0)).length;
        setStats({
          total,
          presentes: 0,
          ausentes: total,
          pendientes
        });
      }
    };
    fetchStats();
  }, [adminSede]);

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* SECCIÓN HERO GRADIENTE DE BIENVENIDA COMPACTA */}
      <div className="relative overflow-hidden rounded-2xl gradient-mesh-bg p-5 md:p-6 text-white shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-bold text-blue-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SISTEMA DE ASISTENCIA BIOMÉTRICA EN VIVO
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-white">
              Centro de Control Institucional {mounted && adminSede ? `• Sede ${adminSede}` : ''}
            </h1>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Monitoreo biométrico en tiempo real, gestión de expedientes de personal y control de inventarios.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/marcaje"
              target="_blank"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 tracking-wider uppercase border border-emerald-400/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Abrir Kiosco Marcaje
            </Link>
          </div>
        </div>
      </div>

      {/* KPI GRID - ESTILO ELEVADO CON SOMBRAS SUAVES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Funcionarios"
          value={stats.total}
          subtext="Expedientes en plantilla"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          accentColor="border-l-blue-600"
          bgBadge="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Cobertura Biométrica"
          value={`${stats.total ? Math.round(((stats.total - stats.pendientes) / stats.total) * 100) : 0}%`}
          subtext={`${stats.total - stats.pendientes} de ${stats.total} enrolados`}
          icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          accentColor="border-l-emerald-500"
          bgBadge="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Estaciones Activas"
          value="2 Sedes"
          subtext="ROOS y CAES configuradas"
          icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          accentColor="border-l-indigo-600"
          bgBadge="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Pendientes Enrolar"
          value={stats.pendientes}
          subtext="Requieren captura facial"
          icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          accentColor="border-l-amber-500"
          bgBadge="bg-amber-50 text-amber-700"
        />
      </div>

      {/* ACCIONES RÁPIDAS CORPORATIVAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]"></span>
            Módulos del Sistema
          </h2>
          <span className="text-xs text-slate-400 font-semibold">Acceso rápido</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <QuickLink
            href="/admin/empleados"
            title="Gestión de Personal"
            desc="Crear, editar y organizar expedientes oficiales e imprimir carnets QR."
            badge="Directorio"
            icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <QuickLink
            href="/admin/registrar-rostro"
            title="Enrolamiento Facial"
            desc="Captura biométrica de patrones faciales de 128 dimensiones."
            badge="Biometría IA"
            icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          />
          <QuickLink
            href="/admin/reportes"
            title="Centro Analítico"
            desc="Centro de mando unificado de informes, asistencias y exportaciones."
            badge="Análisis PDF/Excel"
            icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <QuickLink
            href="/admin/inventarios"
            title="Control Inventarios"
            desc="Gestión de prendas, suministros y vales de entrega en PDF."
            badge="Stock"
            icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />
        </div>
      </div>

      {/* ALERTAS CRÍTICAS */}
      {stats.pendientes > 0 && (
        <div className="p-6 bg-amber-50/90 border border-amber-200/90 rounded-3xl flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Acción Requerida: Enrolamiento Biométrico Pendiente</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed font-medium">
              Existen <span className="font-bold text-amber-950">{stats.pendientes} funcionario(s)</span> registrados en el sistema que aún no cuentan con su perfil biométrico facial. Complete el proceso para permitir su marcaje en el Kiosco.
            </p>
            <Link href="/admin/registrar-rostro" className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-amber-900 hover:text-amber-950 underline">
              COMPLETAR ENROLAMIENTO FACIAL →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtext, icon, accentColor, bgBadge }: any) {
  return (
    <div className={`glass-panel p-6 rounded-3xl border-l-4 ${accentColor} card-hover bg-white`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 bg-slate-100 rounded-2xl">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${bgBadge}`}>
          Activo
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        <p className="text-[10px] font-semibold text-slate-400">{subtext}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc, badge, icon }: any) {
  return (
    <Link href={href} className="glass-panel p-6 rounded-3xl border border-slate-200/80 card-hover bg-white flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-[#1E3A8A] transition-colors">
            {badge}
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1E3A8A] transition-colors mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1E3A8A] group-hover:translate-x-1 transition-transform">
        <span>Acceder al módulo</span>
        <span>→</span>
      </div>
    </Link>
  );
}

