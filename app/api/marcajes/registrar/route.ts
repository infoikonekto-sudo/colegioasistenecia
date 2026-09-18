import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST /api/marcajes/registrar
 * Registrar marcaje facial/QR de empleado con foto de evidencia silenciosa
 */
export async function POST(request: NextRequest) {
  try {
    // ── Validación de seguridad del Kiosco ──
    const kioskPin = request.headers.get('x-kiosk-pin');
    const validPin = process.env.KIOSK_SECRET || 'H@Wrrhh';
    if (!process.env.KIOSK_SECRET) {
      console.warn('[Seguridad] ⚠️ KIOSK_SECRET no está definida en las variables de entorno. Se recomienda configurarla en el servidor.');
    }
    if (!kioskPin || kioskPin !== validPin) {
      return NextResponse.json({ error: 'Acceso denegado al Kiosco. PIN de autorización inválido.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      empleadoId,
      empleado_id,
      tipo, // 'entrada' o 'salida'
      puntoDeMarcaje,
      punto_marcaje,
      ipadId,
      ipad_id,
      confianza,
      metodoDiferenciaFacial,
      foto_base64,
      sede,
      qr_escaneado,
      metodo_verificacion,
      notas
    } = body;

    const targetEmpId = empleado_id || empleadoId;
    const targetPunto = punto_marcaje || puntoDeMarcaje || 'Puerta Principal';
    const targetIpad = ipad_id || ipadId || 'Kiosco-01';

    if (!targetEmpId || !tipo) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (empleado_id y tipo)' },
        { status: 400 }
      );
    }

    // ── Prevención de duplicados: verificar marcaje reciente (últimos 3 min) ──
    const tresMinsAtras = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { data: reciente } = await getSupabase()
      .from('marcajes')
      .select('id, timestamp')
      .eq('empleado_id', targetEmpId)
      .gte('timestamp', tresMinsAtras)
      .limit(1);

    if (reciente && reciente.length > 0) {
      return NextResponse.json(
        { success: true, duplicate: true, message: 'Marcaje ya registrado recientemente. Espere un momento.' },
        { status: 200 }
      );
    }

    // Si viene foto_base64, intentar subir a Supabase Storage bucket 'evidencias' (o guardar la data URL directa)
    let fotoEvidenciaUrl = foto_base64 || null;
    if (foto_base64 && foto_base64.startsWith('data:image')) {
      try {
        const base64Data = foto_base64.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `evidencia_${targetEmpId}_${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await getSupabase()
            .storage
            .from('evidencias')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = getSupabase()
              .storage
              .from('evidencias')
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              fotoEvidenciaUrl = publicUrlData.publicUrl;
            }
          }
        }
      } catch (e) {
        console.warn('Fallback: guardando foto de evidencia directa', e);
      }
    }

    // ── Corrección de Zona Horaria a Guatemala ──
    const now = new Date();
    const gtString = now.toLocaleString("en-US", {timeZone: "America/Guatemala"});
    const gtDate = new Date(gtString);
    const fechaGT = `${gtDate.getFullYear()}-${String(gtDate.getMonth()+1).padStart(2,'0')}-${String(gtDate.getDate()).padStart(2,'0')}`;
    const horaGT = `${String(gtDate.getHours()).padStart(2,'0')}:${String(gtDate.getMinutes()).padStart(2,'0')}:${String(gtDate.getSeconds()).padStart(2,'0')}`;

    // Crear registro en la tabla marcajes
    const payloadMarcaje = {
      empleado_id: targetEmpId,
      tipo: tipo,
      fecha: fechaGT,
      hora: horaGT,
      punto_marcaje: targetPunto,
      ipad_id: targetIpad,
      confianza: confianza || 0,
      sede: sede || null,
      qr_escaneado: qr_escaneado || null,
      metodo_verificacion: metodo_verificacion || (metodoDiferenciaFacial ? 'facial' : 'qr_rostro'),
      foto_marcaje_url: fotoEvidenciaUrl,
      notas: notas || null,
      sincronizado: true,
      timestamp: now.toISOString()
    };

    const { data, error } = await getSupabase()
      .from('marcajes')
      .insert([payloadMarcaje])
      .select();

    if (error) {
      console.error('DB Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Marcaje y foto de evidencia guardados: ${targetEmpId} - ${tipo}`);

    return NextResponse.json({
      success: true,
      message: 'Marcaje y foto de evidencia guardados exitosamente',
      marcaje: data?.[0],
      data: data?.[0]
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al registrar marcaje' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marcajes/ultimo?empleado_id=...
 */
export async function GET(request: NextRequest) {
  try {
    const empleadoId = request.nextUrl.searchParams.get('empleado_id');

    if (!empleadoId) {
      return NextResponse.json(
        { error: 'Falta empleado_id' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('marcajes')
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('DB Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lastMarcaje: data?.[0] || null
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
