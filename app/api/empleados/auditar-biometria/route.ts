import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseGlobalRoot() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function euclideanDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function computeCentroid(vectors: number[][]): number[] {
  if (!vectors || vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += v[i] / vectors.length;
    }
  }
  return avg;
}

function parseDescriptor(raw: any): number[][] {
  if (!raw) return [];
  let val = raw;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { return []; }
  }
  if (!val) return [];
  if (Array.isArray(val) && val.length === 128 && typeof val[0] === 'number') {
    return [val as number[]];
  }
  const vectors: number[][] = [];
  if (Array.isArray(val)) {
    for (const item of val) {
      if (Array.isArray(item) && item.length === 128 && typeof item[0] === 'number') {
        vectors.push(item as number[]);
      } else if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length === 128) vectors.push(parsed as number[]);
        } catch {}
      }
    }
  }
  return vectors;
}

/**
 * GET /api/empleados/auditar-biometria
 * Agente de Auditoría de Salud Biométrica en Segundo Plano.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    const secretKey = process.env.API_SECRET_KEY || process.env.KIOSK_SECRET;

    if (!authHeader && secretKey && apiKey !== secretKey) {
      return NextResponse.json({ error: 'Acceso no autorizado a la auditoría biométrica.' }, { status: 401 });
    }

    const supabase = getSupabaseGlobalRoot();
    const { data: empleados, error } = await supabase
      .from('empleados')
      .select('id, nombre, apellido, cedula, face_descriptor')
      .not('face_descriptor', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalConRostro = empleados?.length || 0;
    const detalles: any[] = [];
    const conflictos: any[] = [];

    const parsedData = (empleados || []).map(emp => ({
      ...emp,
      vectors: parseDescriptor(emp.face_descriptor)
    })).filter(emp => emp.vectors.length > 0);

    for (let i = 0; i < parsedData.length; i++) {
      const e1 = parsedData[i];
      const c1 = computeCentroid(e1.vectors);

      for (let j = i + 1; j < parsedData.length; j++) {
        const e2 = parsedData[j];
        const c2 = computeCentroid(e2.vectors);
        const dCentroid = euclideanDistance(c1, c2);

        if (dCentroid < 0.40) {
          conflictos.push({
            empleado1: `${e1.nombre} ${e1.apellido} (ID: ${e1.id})`,
            empleado2: `${e2.nombre} ${e2.apellido} (ID: ${e2.id})`,
            distanciaCentroide: dCentroid.toFixed(4),
            estado: 'DUPLICADO_CRÍTICO'
          });
        }
      }

      detalles.push({
        id: e1.id,
        nombre: `${e1.nombre} ${e1.apellido}`,
        vectoresGuardados: e1.vectors.length,
        salud: e1.vectors.length >= 3 ? 'ÓPTIMA' : 'ESTÁNDAR'
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      saludGeneral: conflictos.length === 0 ? 'EXCELENTE' : 'REQUIERE_ATENCION',
      totalEnrolados: totalConRostro,
      totalConflictos: conflictos.length,
      conflictos,
      detalles
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al auditar biometría' }, { status: 500 });
  }
}
