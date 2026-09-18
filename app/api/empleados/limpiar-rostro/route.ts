import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseGlobalRoot() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST /api/empleados/limpiar-rostro
 * Elimina el registro biométrico facial de un empleado para permitir un enrolamiento completamente limpio.
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Verificación de Seguridad ───
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.API_SECRET_KEY || process.env.KIOSK_SECRET;

    if (!authHeader && secretKey && apiKey !== secretKey) {
      return NextResponse.json({ error: 'Acceso no autorizado para reinicio biométrico.' }, { status: 401 });
    }

    const body = await request.json();
    const { empleadoId } = body;

    if (!empleadoId) {
      return NextResponse.json({ error: 'Falta empleadoId' }, { status: 400 });
    }

    const supabase = getSupabaseGlobalRoot();

    const { data: emp, error: fetchErr } = await supabase
      .from('empleados')
      .select('id, nombre, apellido')
      .eq('id', empleadoId)
      .single();

    if (fetchErr || !emp) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 444 });
    }

    const { error: updateErr } = await supabase
      .from('empleados')
      .update({ face_descriptor: null, updated_at: new Date().toISOString() })
      .eq('id', empleadoId);

    if (updateErr) {
      console.error('Error al limpiar rostro:', updateErr);
      return NextResponse.json({ error: 'Error al actualizar base de datos' }, { status: 500 });
    }

    // Log de auditoría
    try {
      await supabase.from('logs_auditoria').insert({
        tipo_evento: 'BIOMETRIA_FACIAL_RESET',
        descripcion: `Se eliminó el perfil biométrico facial de ${emp.nombre} ${emp.apellido} para reinicio de enrolamiento.`,
        tabla_afectada: 'empleados',
        registro_id: empleadoId,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Registro facial de ${emp.nombre} ${emp.apellido} eliminado correctamente.`
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
