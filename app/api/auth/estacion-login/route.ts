import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const { usuario, password } = await request.json();

    if (!usuario || !password) {
      return NextResponse.json({ success: false, error: 'Usuario y contraseña son requeridos.' }, { status: 400 });
    }

    const cleanInput = usuario.trim().toLowerCase().replace(/@mao\.com$/, '');
    const cleanPassword = password.trim();

    const supabase = getSupabaseAdmin();
    const { data: configRow } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', 'estaciones_kiosco_list')
      .single();

    if (!configRow || !Array.isArray(configRow.valor)) {
      return NextResponse.json({ success: false, error: 'No existen estaciones registradas.' }, { status: 404 });
    }

    const estaciones: any[] = configRow.valor;

    const match = estaciones.find((e: any) => 
      e.usuario.trim().toLowerCase() === cleanInput && e.password.trim() === cleanPassword
    );

    if (!match) {
      return NextResponse.json({ success: false, error: 'Credenciales de estación inválidas.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: match.id,
        usuario: match.usuario,
        sede: match.sede,
        estacion: match.estacion
      }
    });
  } catch (err: any) {
    console.error('Error POST /api/auth/estacion-login:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error interno de autenticación' }, { status: 500 });
  }
}
