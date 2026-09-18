'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authService, supabase } from '@/lib/supabase';
import { useAsistenciaStore } from '@/lib/store';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [marcajeExpanded, setMarcajeExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { adminSede, adminTheme, setAdminProfile } = useAsistenciaStore();
  const [isMarcajeUser, setIsMarcajeUser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async (existingUser?: any) => {
      try {
        let currentUser = existingUser || (await authService.getCurrentUser()).user;

        if (!isMounted) return;

        if (!currentUser) {
          setLoadingAuth(false);
          window.location.href = '/login';
          return;
        }

        const emailLower = (currentUser.email || '').toLowerCase();
        if (emailLower.includes('marcaje')) {
          setIsMarcajeUser(true);
          const sede = emailLower.includes('caes') ? 'CAES' : 'ROOS';
          window.location.href = `/marcaje?sede=${sede}`;
          return;
        }

        if (currentUser.email) {
          const { data } = await authService.getAdminProfile(currentUser.email);
          if (data && data.sede) {
            setAdminProfile(data.sede);
          } else {
            setAdminProfile(null);
          }
        }
      } catch (err) {
        console.error('Error en checkSession admin:', err);
      } finally {
        if (isMounted) {
          setLoadingAuth(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkSession(session.user);
      } else if (_event === 'SIGNED_OUT') {
        if (isMounted) {
          setLoadingAuth(false);
          window.location.href = '/login';
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, setAdminProfile]);

  if (loadingAuth || isMarcajeUser) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent animate-spin rounded-full mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Cargando Panel Administrativo...</p>
      </div>
    );
  }

  const menuItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: '/admin/empleados',
      label: 'Personal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      href: '/admin/registrar-rostro',
      label: 'Enrolamiento',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      href: '/admin/inventarios',
      label: 'Inventarios',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      href: '/admin/reportes',
      label: 'Análisis',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: '/admin/configuracion',
      label: 'Configuración',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  const marcajeItem = {
    href: '/marcaje',
    label: 'Marcaje',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.clear();
    sessionStorage.clear();
    
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    window.location.href = '/login';
  };

  return (
    <div className="h-screen bg-slate-50 flex font-sans selection:bg-blue-100 overflow-hidden">

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Rediseñado */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#1E3A8A]
          transition-all duration-300 flex flex-col shadow-2xl border-r border-slate-700/40
        `}
      >
        {/* Brand/Logo Section */}
        <div className="h-20 flex items-center px-5 border-b border-white/10 mb-6 bg-slate-950/20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-[#1E3A8A] text-white flex items-center justify-center border border-blue-400/30 shadow-md shadow-blue-500/20 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          {sidebarOpen && (
            <div className="ml-3.5 truncate animate-fadeIn">
              <h1 className="text-xs font-black text-white tracking-wider uppercase">MANOS A LA OBRA</h1>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SISTEMA RRHH
              </span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((link) => {
            const linkIsActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group ${linkIsActive
                  ? 'bg-white/15 text-white font-bold shadow-md shadow-black/10 backdrop-blur-sm border border-white/20'
                  : 'text-slate-300/70 hover:text-white hover:bg-white/10 font-medium'
                  }`}
              >
                {linkIsActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-400 rounded-r-full shadow-sm shadow-blue-400/50" />
                )}
                <div className={`${linkIsActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'} flex-shrink-0 transition-colors`}>
                  {link.icon}
                </div>
                {sidebarOpen && (
                  <span className="text-xs tracking-wide truncate">
                    {link.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Separador + Marcaje (Dropdown de Sedes) */}
          <div className="pt-4 mt-4 border-t border-white/10 space-y-1.5">
            <button
              onClick={() => setMarcajeExpanded(!marcajeExpanded)}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all group text-slate-300/70 hover:text-white hover:bg-white/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="text-slate-400 group-hover:text-white flex-shrink-0">
                  {marcajeItem.icon}
                </div>
                {sidebarOpen && (
                  <span className="text-xs font-semibold tracking-wide">Kiosco Marcaje</span>
                )}
              </div>
              {sidebarOpen && (
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${marcajeExpanded ? 'rotate-90 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {marcajeExpanded && sidebarOpen && (
              <div className="ml-9 space-y-1 animate-fadeIn">
                {mounted && (!adminSede || adminSede === 'ROOS') && (
                  <Link
                    href="/marcaje?sede=ROOS"
                    target="_blank"
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-slate-300/80 hover:text-white rounded-lg transition-colors border-l-2 border-blue-400/40 hover:border-blue-400 hover:bg-white/5"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    Sede ROOS
                  </Link>
                )}
                {mounted && (!adminSede || adminSede === 'CAES') && (
                  <Link
                    href="/marcaje?sede=CAES"
                    target="_blank"
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-slate-300/80 hover:text-white rounded-lg transition-colors border-l-2 border-emerald-400/40 hover:border-emerald-400 hover:bg-white/5"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    Sede CAES
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-bold"
          >
            <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full mt-3 flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            title="Contraer menú"
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">

        {/* Header Superior */}
        <header className="h-16 border-b border-slate-200/80 flex items-center justify-between px-6 bg-white z-40 sticky top-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileSidebarOpen(v => !v)}
              aria-label="Abrir menú"
            >
              {mobileSidebarOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 hidden lg:block shadow-sm shadow-emerald-500/50"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono hidden lg:block">STATUS: ONLINE // CONEXIÓN SEGURA</p>
            <p className="text-sm font-black text-[#1E3A8A] lg:hidden">MANOS A LA OBRA</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 mb-0.5 uppercase tracking-wide">
                {adminSede ? `ADMINISTRADOR SEDE ${adminSede}` : 'ADMINISTRADOR GENERAL'}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">PANEL RRHH</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center overflow-hidden shadow-xs">
              <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Sección Principal */}
        <section className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5 bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
