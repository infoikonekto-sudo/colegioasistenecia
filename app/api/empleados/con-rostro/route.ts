import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
}



/**
 * GET /api/empleados/con-rostro
 * Obtener todos los empleados que tienen rostro registrado
 * Usado para reconocimiento facial
 */
export async function GET(request: NextRequest) {
  try {
    // Basic API Key validation
    const apiKey = request.headers.get('x-api-key');
    const validKey = process.env.API_SECRET_KEY;
    
    if (!validKey || apiKey !== validKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getSupabase()
      .from('empleados')
      .select('id, nombre, email, face_descriptor, departamento_id, cargo_id')
      .not('face_descriptor', 'is', null);

    if (error) {
      console.error('DB Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Empleados con rostro recuperados: ${data?.length || 0}`);

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      employees: data || []
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
