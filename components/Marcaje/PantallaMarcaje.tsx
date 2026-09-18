'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LectorQR from './LectorQR';
import VerificacionFacialUnoAUno from './VerificacionFacialUnoAUno';
import MarcajeConfirmacion from './MarcajeConfirmacion';
import PoliticasYTerminosModal from '../Legal/PoliticasYTerminosModal';
import { authService, empleadosService, marcajesService, marcajesFallidosService, configDescansosService } from '@/lib/supabase';
import { facialEngine } from '@/lib/facialRecognitionEngine';
import { getCurrentTime, getTodayDate } from '@/lib/utils';
import { Empleado, Marcaje } from '@/types';

const ACCESS_CODE = 'H@Wrrhh';

interface PantallaMarcajeProps {
  puntoDeMarcaje: string;
  ipadId: string;
  sede: string;
}

type FlujoStep = 'escaneo_qr' | 'verificacion_facial' | 'confirmacion' | 'error';
type SessionEstado = 'bloqueado' | 'activo';

export default function PantallaMarcaje({ puntoDeMarcaje, ipadId, sede }: PantallaMarcajeProps) {
  // Legal Modal
  const [modalLegalOpen, setModalLegalOpen] = useState(false);

  // Session & Security Lock
  const [session, setSession] = useState<SessionEstado>('activo');
  const [codigo, setCodigo] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flujo Kiosco QR -> Rostro 1:1
  const [step, setStep] = useState<FlujoStep>('escaneo_qr');
  const [modoSeleccionado, setModoSeleccionado] = useState<'qr' | 'facial' | 'cedula'>('qr');
  const [cedulaInput, setCedulaInput] = useState('');
  const [empleadoActual, setEmpleadoActual] = useState<Empleado | null>(null);
  const [marcajeRealizado, setMarcajeRealizado] = useState<Marcaje | null>(null);
  const [mensajeError, setMensajeError] = useState('');
  const [cargandoEmpleado, setCargandoEmpleado] = useState(false);
  const [tiempoActual, setTiempoActual] = useState<Date | null>(null);
  const [montado, setMontado] = useState(false);
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);

  useEffect(() => {
    setMontado(true);
    setTiempoActual(new Date());
    const timer = setInterval(() => setTiempoActual(new Date()), 1000);

    // Pre-cargar modelos biométricos en segundo plano para que el paso QR -> Rostro sea instantáneo (0ms)
    facialEngine.loadModels().catch(console.warn);

    // Auto-activar sesión kiosco para usuarios autenticados o usuarios de estación en localStorage
    try {
      const estSession = localStorage.getItem('estacion_session');
      if (estSession) {
        setSession('activo');
      }
    } catch (_) {}

    authService.getCurrentUser().then(({ user }) => {
      if (user) {
        setSession('activo');
      }
    });

    return () => clearInterval(timer);
  }, []);

  // ── 1. Desbloqueo por código PIN de seguridad ──────────────────────────────
  const handleValidarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo === ACCESS_CODE) {
      setSession('activo');
      setCodigoError('');
      setCodigo('');
    } else {
      setCodigoError('CÓDIGO INCORRECTO. INTENTE NUEVAMENTE.');
      setCodigo('');
      inputRef.current?.focus();
    }
  };

  // ── 2. Paso 1: Lectura de QR exitosa ─────────────────────────────────────
  const handleScanQRSuccess = useCallback(async (qrCodeScanned: string) => {
    if (cargandoEmpleado || step !== 'escaneo_qr') return;

    setCargandoEmpleado(true);
    try {
      // Buscar empleado por qr_code en Supabase
      const { data: emp, error } = await empleadosService.getByQrCode(qrCodeScanned);

      if (error || !emp) {
        setMensajeError(`Código QR no registrado (${qrCodeScanned}). Solicite enrolamiento a RRHH.`);
        setStep('error');
        setTimeout(() => {
          setStep('escaneo_qr');
          setCargandoEmpleado(false);
        }, 3000);
        return;
      }

      if (!emp.face_descriptor || (Array.isArray(emp.face_descriptor) && emp.face_descriptor.length === 0)) {
        setMensajeError(`El funcionario ${emp.nombre} ${emp.apellido} no tiene rostro enrolado.`);
        setStep('error');
        setTimeout(() => {
          setStep('escaneo_qr');
          setCargandoEmpleado(false);
        }, 3000);
        return;
      }

      // Verificar cooldown de 5 minutos antes de pasar a la cámara facial
      const fechaHoy = getTodayDate();
      const { data: marcajesHoy } = await marcajesService.getByEmpleadoAndFecha(emp.id, fechaHoy);
      if (marcajesHoy && marcajesHoy.length > 0) {
        const ultimo = marcajesHoy[marcajesHoy.length - 1];
        const diffMs = Date.now() - new Date(ultimo.timestamp).getTime();
        const diffMin = diffMs / (1000 * 60);

        if (diffMin < 5) {
          const segsRestantes = Math.ceil((5 - diffMin) * 60);
          setCooldownTime(segsRestantes);
          setMensajeError(`Marcaje reciente registrado. Por favor espere unos minutos antes de volver a marcar.`);
          setEmpleadoActual(emp);
          setStep('error');
          setTimeout(() => {
            setStep('escaneo_qr');
            setEmpleadoActual(null);
            setCargandoEmpleado(false);
            setCooldownTime(null);
          }, 3500);
          return;
        }
      }

      // Empleado válido -> Pasar al Paso 2: Verificación Facial 1:1
      setEmpleadoActual(emp);
      setStep('verificacion_facial');
    } catch (err) {
      console.error('Error al procesar QR:', err);
      setMensajeError('Error de red al consultar el código QR.');
      setStep('error');
      setTimeout(() => {
        setStep('escaneo_qr');
        setCargandoEmpleado(false);
      }, 3000);
    } finally {
      setCargandoEmpleado(false);
    }
  }, [cargandoEmpleado, step]);

  // ── 3. Paso 2: Verificación Facial Exitosa & IA Auto-Aprendizaje ──────────
  const handleFacialSuccess = useCallback(async (fotoBase64: string, confianza: number, liveDescriptor?: Float32Array) => {
    if (!empleadoActual) return;

    // 🤖 IA DE AUTO-APRENDIZAJE EN SEGUNDO PLANO
    // Si la muestra capturada aporta un nuevo ángulo o iluminación, se guarda automáticamente en Supabase
    if (liveDescriptor && empleadoActual.face_descriptor) {
      try {
        const evalRes = facialEngine.evalAutoAprendizaje(liveDescriptor, empleadoActual.face_descriptor as any);
        if (evalRes.debeGuardar && evalRes.nuevosDescriptores.length > 0) {
          empleadosService.updateFaceDescriptor(empleadoActual.id, evalRes.nuevosDescriptores)
            .then(() => console.log(`[Auto-Aprendizaje IA] 🤖 Perfil biométrico enriquecido para ${empleadoActual.nombre}`))
            .catch((e) => console.warn('[Auto-Aprendizaje IA] Omitido:', e));
        }
      } catch (_) {}
    }

    try {
      const fechaHoy = getTodayDate();
      const horaHoy = getCurrentTime();

      // Determinar si hoy es día de descanso o festivo para su área (sin bloquear, flaggear como excepción)
      let esDescanso = false;
      let notaAdicional = '';
      try {
        const dayOfWeek = new Date().getDay(); // 0 = Domingo
        const { data: descansos } = await configDescansosService.getAll();
        if (descansos) {
          const matchDesc = descansos.find((d: any) => 
            (!d.area_id || d.area_id === empleadoActual.area_id) &&
            (d.tipo === 'dia_semana' && d.dia_semana === dayOfWeek)
          );
          if (matchDesc) {
            esDescanso = true;
            notaAdicional = `Marcaje en día de descanso (${matchDesc.descripcion || 'Descanso semanal'})`;
          }
        }
      } catch (_) {}

      // Determinar tipo (Entrada / Salida)
      const { data: marcajesHoy } = await marcajesService.getByEmpleadoAndFecha(empleadoActual.id, fechaHoy);
      const tipoMarcaje: 'entrada' | 'salida' = (marcajesHoy && marcajesHoy.length % 2 === 1) ? 'salida' : 'entrada';

      // Invocar API POST /api/marcajes/registrar
      const response = await fetch('/api/marcajes/registrar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-kiosk-pin': ACCESS_CODE 
        },
        body: JSON.stringify({
          empleado_id: empleadoActual.id,
          tipo: tipoMarcaje,
          punto_marcaje: puntoDeMarcaje,
          ipad_id: ipadId,
          foto_base64: fotoBase64,
          confianza: confianza,
          sede: sede,
          qr_escaneado: empleadoActual.qr_code,
          metodo_verificacion: 'qr_rostro',
          notas: notaAdicional || undefined
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        setMensajeError(resData.error || 'Error al guardar la asistencia.');
        setStep('error');
        setTimeout(() => resetFlujo(), 3500);
        return;
      }

      setMarcajeRealizado(resData.data || {
        id: 'tmp',
        empleado_id: empleadoActual.id,
        tipo: tipoMarcaje,
        fecha: fechaHoy,
        hora: horaHoy,
        timestamp: new Date().toISOString(),
        punto_marcaje: puntoDeMarcaje,
        ipad_id: ipadId,
        confianza: confianza,
        sincronizado: true,
        created_at: new Date().toISOString()
      });

      setStep('confirmacion');
      setTimeout(() => resetFlujo(), 2500);
    } catch (err) {
      console.error('Error al registrar marcaje:', err);
      setMensajeError('Error de servidor al guardar la asistencia.');
      setStep('error');
      setTimeout(() => resetFlujo(), 3500);
    }
  }, [empleadoActual, puntoDeMarcaje, ipadId, sede]);

  // ── 4. Paso 2: Verificación Facial 1:1 Fallida (Intento no coincidente) ────
  const handleFacialFailure = useCallback(async (distancia: number, motivo: string) => {
    // Registrar auditoría de intento fallido en la base de datos
    if (empleadoActual) {
      try {
        await marcajesFallidosService.create({
          empleado_id: empleadoActual.id,
          qr_escaneado: empleadoActual.qr_code,
          distancia_facial: distancia,
          punto_marcaje: puntoDeMarcaje,
          timestamp: new Date().toISOString()
        });
      } catch (_) {}
    }

    setMensajeError(`Verificación facial no superada (Distancia: ${distancia.toFixed(2)}). Asegúrese de mirar de frente a la cámara.`);
    setStep('error');
    setTimeout(() => resetFlujo(), 3500);
  }, [empleadoActual, puntoDeMarcaje]);

  const resetFlujo = useCallback(() => {
    setEmpleadoActual(null);
    setMarcajeRealizado(null);
    setMensajeError('');
    setCargandoEmpleado(false);
    setCooldownTime(null);
    setCedulaInput('');
    setStep('escaneo_qr');
  }, []);

  // ── Renderizado Bloqueado por PIN ──────────────────────────────────────────
  if (session === 'bloqueado') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-[#1E3A8A]/10 text-[#1E3A8A] rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Estación Kiosco Biométrico</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Sede: {sede} • Punto: {puntoDeMarcaje}</p>
          </div>
          <form onSubmit={handleValidarCodigo} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={mostrarCodigo ? "text" : "password"}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ingrese clave PIN de acceso"
                className="w-full text-center text-lg tracking-widest font-mono bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarCodigo(!mostrarCodigo)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                {mostrarCodigo ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {codigoError && <p className="text-xs font-bold text-rose-600 leading-tight">{codigoError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              ACTIVAR ESTACIÓN DE MARCAJE
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Renderizado Kiosco Activo ──────────────────────────────────────────────
  const handleBuscarCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput.trim()) return;
    setCargandoEmpleado(true);
    try {
      const { data: emp, error } = await empleadosService.getByCedula(cedulaInput.trim());
      if (error || !emp) {
        setMensajeError(`No se encontró empleado registrado con la cédula (${cedulaInput}).`);
        setStep('error');
        setTimeout(() => { setStep('escaneo_qr'); setCargandoEmpleado(false); }, 3000);
        return;
      }
      setEmpleadoActual(emp);
      setStep('verificacion_facial');
    } catch (err) {
      setMensajeError('Error de red al consultar cédula.');
      setStep('error');
      setTimeout(() => { setStep('escaneo_qr'); setCargandoEmpleado(false); }, 3000);
    } finally {
      setCargandoEmpleado(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 select-none overflow-hidden">
      
      {/* Barra Superior Kiosco */}
      <header className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-blue-700 flex items-center justify-center font-black text-amber-400 text-lg shadow-lg shadow-blue-900/30 border border-blue-400/30">
            MAO
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight leading-none text-white uppercase">Colegio Manos a la Obra</h1>
            <p className="text-xs text-blue-400 font-semibold mt-0.5">Estación Biométrica • Sede {sede}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums tracking-wider drop-shadow-md">
              {montado && tiempoActual ? tiempoActual.toLocaleTimeString('es-ES') : ''}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Punto: {puntoDeMarcaje}
            </div>
          </div>
          <button
            onClick={() => setSession('bloqueado')}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all shadow-sm active:scale-95"
            title="Bloquear Kiosco"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
          <button
            onClick={async () => {
              try {
                await authService.signOut();
              } catch (_) {}
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white rounded-xl border border-rose-800/50 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Finalizar Sesión"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5" />
            </svg>
            <span className="hidden sm:inline">Finalizar Sesión</span>
          </button>
        </div>
      </header>

      {/* Selector de Modo de Marcaje */}
      {step === 'escaneo_qr' && (
        <div className="my-2 flex justify-center">
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex gap-2 shadow-inner max-w-md w-full">
            <button
              onClick={() => setModoSeleccionado('qr')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                modoSeleccionado === 'qr'
                  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/50 border border-blue-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Carnet QR
            </button>

            <button
              onClick={() => setModoSeleccionado('cedula')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                modoSeleccionado === 'cedula'
                  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/50 border border-blue-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
              </svg>
              Cédula
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal de Flujo Kiosco */}
      <main className="my-auto py-4 flex flex-col items-center justify-center">

        {step === 'escaneo_qr' && modoSeleccionado === 'qr' && (
          <LectorQR onScanSuccess={handleScanQRSuccess} />
        )}

        {step === 'escaneo_qr' && modoSeleccionado === 'cedula' && (
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Ingreso por Cédula</h3>
              <p className="text-xs text-slate-400 mt-1">Ingrese su número de documento para iniciar la validación biométrica</p>
            </div>
            <form onSubmit={handleBuscarCedula} className="space-y-4">
              <input
                type="text"
                value={cedulaInput}
                onChange={(e) => setCedulaInput(e.target.value)}
                placeholder="Ej: 0102030405"
                maxLength={10}
                className="w-full text-center text-xl tracking-widest font-mono bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                autoFocus
              />
              <button
                type="submit"
                disabled={cargandoEmpleado || !cedulaInput.trim()}
                className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
              >
                {cargandoEmpleado ? 'Buscando...' : 'VERIFICAR Y CONTINUAR'}
              </button>
            </form>
          </div>
        )}

        {step === 'verificacion_facial' && empleadoActual && (
          <VerificacionFacialUnoAUno
            empleado={empleadoActual}
            puntoMarcaje={puntoDeMarcaje}
            onSuccess={handleFacialSuccess}
            onFailure={handleFacialFailure}
            onCancel={resetFlujo}
          />
        )}

        {step === 'confirmacion' && empleadoActual && marcajeRealizado && (
          <MarcajeConfirmacion
            empleado={empleadoActual}
            marcaje={marcajeRealizado}
            onComplete={resetFlujo}
          />
        )}

        {step === 'error' && (
          <div className="w-full max-w-lg bg-rose-950/90 border-2 border-rose-500/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl animate-shake">
            <div className="w-16 h-16 bg-rose-900/50 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-rose-200 uppercase tracking-tight">Acción Rechazada</h3>
            <p className="text-sm font-medium text-rose-300 leading-relaxed">{mensajeError}</p>
            {cooldownTime !== null && (
              <div className="text-xs font-mono font-bold text-rose-400">
                Tiempo de espera: {cooldownTime} segundos
              </div>
            )}
            <button
              onClick={resetFlujo}
              className="px-6 py-2.5 bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              VOLVER AL INICIO
            </button>
          </div>
        )}

      </main>

      {/* Pie de página Kiosco */}
      <footer className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-center justify-between text-center gap-2">
        <p className="text-[11px] text-slate-500 font-medium">
          Sistema de Marcaje Biométrico 1:1 • Colegio Manos a la Obra © {new Date().getFullYear()}
        </p>
        <button
          onClick={() => setModalLegalOpen(true)}
          className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1 mx-auto sm:mx-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Privacidad y Términos de Uso
        </button>
      </footer>

      {/* MODAL DE POLÍTICA Y TÉRMINOS */}
      <PoliticasYTerminosModal
        isOpen={modalLegalOpen}
        onClose={() => setModalLegalOpen(false)}
      />
    </div>
  );
}
