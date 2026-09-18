import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

const ESTACIONES_VALIDAS = [
  'Administración',
  'Preprimaria',
  'Secundaria',
  'Casita',
  'Primaria Elemental',
  'Primaria Superior',
  'Recepción'
];

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const sedeFilter = searchParams.get('sede');

    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', 'estaciones_kiosco_list')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo estaciones:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let estaciones: any[] = (data?.valor && Array.isArray(data.valor)) ? data.valor : [];

    if (sedeFilter) {
      const sf = sedeFilter.toUpperCase().trim();
      estaciones = estaciones.filter(e => e.sede?.toUpperCase() === sf || e.sede === 'AMBAS');
    }

    // Omitir contraseñas en la respuesta pública/admin por seguridad
    const safeEstaciones = estaciones.map(({ password, ...rest }) => rest);

    return NextResponse.json({ success: true, data: safeEstaciones });
  } catch (err: any) {
    console.error('Error GET /api/estaciones:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, password, sede, estacion, id } = body;

    if (!usuario || !usuario.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre de usuario es obligatorio.' }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ success: false, error: 'La contraseña es obligatoria.' }, { status: 400 });
    }
    if (!sede || !['CAES', 'ROOS', 'AMBAS'].includes(sede.toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Sede no válida (debe ser CAES o ROOS).' }, { status: 400 });
    }
    if (!estacion || !ESTACIONES_VALIDAS.includes(estacion)) {
      return NextResponse.json({ 
        success: false, 
        error: `Estación no válida. Opciones permitidas: ${ESTACIONES_VALIDAS.join(', ')}` 
      }, { status: 400 });
    }

    const cleanUsuario = usuario.trim().toLowerCase();
    const supabase = getSupabaseAdmin();

    // Obtener lista actual de la base de datos
    const { data: configRow } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', 'estaciones_kiosco_list')
      .single();

    let estaciones: any[] = (configRow?.valor && Array.isArray(configRow.valor)) ? configRow.valor : [];

    // Validar nombre de usuario duplicado (si se crea nuevo o cambia usuario)
    const existeDuplicado = estaciones.some(e => e.usuario.toLowerCase() === cleanUsuario && e.id !== id);
    if (existeDuplicado) {
      return NextResponse.json({ success: false, error: `El usuario '${cleanUsuario}' ya existe para otra estación.` }, { status: 400 });
    }

    let itemActualizado: any;

    if (id) {
      // Actualizar existente
      estaciones = estaciones.map(e => {
        if (e.id === id) {
          itemActualizado = {
            ...e,
            usuario: cleanUsuario,
            password: password.trim(),
            sede: sede.toUpperCase(),
            estacion: estacion,
            updated_at: new Date().toISOString()
          };
          return itemActualizado;
        }
        return e;
      });
    } else {
      // Crear nuevo
      itemActualizado = {
        id: `estacion_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        usuario: cleanUsuario,
        password: password.trim(),
        sede: sede.toUpperCase(),
        estacion: estacion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      estaciones.push(itemActualizado);
    }

    // Upsert a la tabla configuracion
    if (configRow) {
      const { error: updateErr } = await supabase
        .from('configuracion')
        .update({ valor: estaciones, updated_at: new Date().toISOString() })
        .eq('clave', 'estaciones_kiosco_list');

      if (updateErr) {
        console.error('Error update configuracion estaciones:', updateErr);
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabase
        .from('configuracion')
        .insert({
          id: crypto.randomUUID(),
          clave: 'estaciones_kiosco_list',
          valor: estaciones,
          descripcion: 'Usuarios y contraseñas de estaciones de marcaje kiosco',
          updated_at: new Date().toISOString()
        });

      if (insertErr) {
        console.error('Error insert configuracion estaciones:', insertErr);
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: itemActualizado });
  } catch (err: any) {
    console.error('Error POST /api/estaciones:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error al guardar la estación.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de estación no proporcionado.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: configRow } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', 'estaciones_kiosco_list')
      .single();

    if (!configRow || !Array.isArray(configRow.valor)) {
      return NextResponse.json({ success: false, error: 'No se encontraron estaciones.' }, { status: 404 });
    }

    const estacionesNuevas = configRow.valor.filter((e: any) => e.id !== id);

    const { error: updateErr } = await supabase
      .from('configuracion')
      .update({ valor: estacionesNuevas, updated_at: new Date().toISOString() })
      .eq('clave', 'estaciones_kiosco_list');

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/estaciones:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error al eliminar la estación.' }, { status: 500 });
  }
}
