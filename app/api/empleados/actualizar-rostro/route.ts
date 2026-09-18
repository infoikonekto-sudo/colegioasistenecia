import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase(authHeader?: string | null) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}

// Cliente global sin RLS para consulta exhaustiva de duplicados biométricos
function getSupabaseGlobalRoot() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ============================================================
// CONSTANTES BIOMÉTRICAS FACENET (128D)
// <= 0.40 = Mismo rostro (Duplicado idéntico)
// 0.41 - 0.46 = Advertencia de alta similitud (gemelos/familiares)
// >= 0.47 = Personas completamente diferentes
// ============================================================
const THRESHOLD_DUPLICADO = 0.40;   // Umbral estricto para bloquear duplicados reales
const THRESHOLD_SOSPECHOSO = 0.46;  // Advertencia de alta similitud (gemelos/familiares)

/**
 * Distancia euclidiana entre dos embeddings de 128 dimensiones.
 */
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

/**
 * Parsea con seguridad cualquier descriptor facial (string JSON, vector único, o multi-vector)
 */
function parseDescriptor(raw: any): number[][] {
  if (!raw) return [];
  let val = raw;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (!val) return [];

  // Vector único de 128 números
  if (Array.isArray(val) && val.length === 128 && typeof val[0] === 'number') {
    return [val as number[]];
  }

  // Array de vectores [[128], [128], ...]
  const vectors: number[][] = [];
  if (Array.isArray(val)) {
    for (const item of val) {
      if (Array.isArray(item) && item.length === 128 && typeof item[0] === 'number') {
        vectors.push(item as number[]);
      } else if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length === 128) {
            vectors.push(parsed as number[]);
          }
        } catch {}
      }
    }
  }
  return vectors;
}

/**
 * POST /api/empleados/actualizar-rostro
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 0. Autenticación (Opcional si viene cabecera) ──────
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabaseAuth.auth.getUser(token);
      } catch (_) {
        // Ignorar si el token es de sesión local de admin
      }
    }

    const body = await request.json();
    const { empleadoId, face_descriptor, face_descriptors, force } = body;

    // ─── 1. Validación básica ────────────────────────────────
    if (!empleadoId || !face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return NextResponse.json(
        { error: 'Datos de enrolamiento inválidos. Se requiere un descriptor facial de 128 dimensiones.' },
        { status: 400 }
      );
    }

    // ─── 2. Cargar todos los embeddings existentes (Blindado sin RLS) ───────
    const supabaseGlobal = getSupabaseGlobalRoot();
    const { data: empleadosConRostro, error: loadError } = await supabaseGlobal
      .from('empleados')
      .select('id, nombre, apellido, cedula, departamento, sede, face_descriptor')
      .not('face_descriptor', 'is', null)
      .neq('id', empleadoId);

    if (loadError) {
      console.error('Error cargando embeddings existentes:', loadError);
      return NextResponse.json(
        { error: 'Error al verificar duplicados biométricos en la base de datos.' },
        { status: 500 }
      );
    }

    // ─── 3. Verificación anti-duplicado basada en Centroides y Distancia Promedio ────────
    const incomingVectors: number[][] = [];
    if (Array.isArray(face_descriptors) && face_descriptors.length > 0) {
      for (const vec of face_descriptors) {
        if (Array.isArray(vec) && vec.length === 128) incomingVectors.push(vec);
      }
    }
    if (incomingVectors.length === 0) {
      incomingVectors.push(face_descriptor);
    }

    const incomingCentroid = computeCentroid(incomingVectors);

    let mejorMatch: { empleado: any; distanciaCentroide: number; distanciaPromedio: number } | null = null;

    for (const emp of empleadosConRostro || []) {
      const storedVectors = parseDescriptor(emp.face_descriptor);
      if (storedVectors.length === 0) continue;
      
      const storedCentroid = computeCentroid(storedVectors);
      
      // Distancia entre centroides faciales
      const dCentroid = euclideanDistance(incomingCentroid, storedCentroid);

      // Distancia promedio entre pares de vectores
      let sumPair = 0;
      let countPair = 0;
      for (const inVec of incomingVectors) {
        for (const stVec of storedVectors) {
          sumPair += euclideanDistance(inVec, stVec);
          countPair++;
        }
      }
      const dAvgPair = countPair > 0 ? sumPair / countPair : dCentroid;

      // El match representativo usa el dCentroid principal
      if (mejorMatch === null || dCentroid < mejorMatch.distanciaCentroide) {
        mejorMatch = {
          empleado: emp,
          distanciaCentroide: dCentroid,
          distanciaPromedio: dAvgPair
        };
      }
    }

    // ─── 4. Bloquear solo si es un DUPLICADO REAL IDÉNTICO (< 0.40 en dCentroid o dAvgPair) ─────
    const esDuplicadoReal = mejorMatch && (mejorMatch.distanciaCentroide < THRESHOLD_DUPLICADO || mejorMatch.distanciaPromedio < THRESHOLD_DUPLICADO);

    if (!force && esDuplicadoReal && mejorMatch) {
      const emp = mejorMatch.empleado;
      const distEfectiva = Math.min(mejorMatch.distanciaCentroide, mejorMatch.distanciaPromedio);
      const similitud = Math.round((1 - distEfectiva / 2) * 100);

      // Log de auditoría del intento de duplicado
      try {
        await supabaseGlobal.from('logs_auditoria').insert({
          tipo_evento: 'ENROLAMIENTO_DUPLICADO_RECHAZADO',
          descripcion: `Intento de registrar rostro duplicado. El rostro ya pertenece a ${emp.nombre} ${emp.apellido} (Cédula: ${emp.cedula}). Distancia centroide: ${mejorMatch.distanciaCentroide.toFixed(4)}`,
          tabla_afectada: 'empleados',
          registro_id: emp.id,
          datos_nuevos: { empleado_id_rechazado: empleadoId, similitud_calculada: similitud }
        });
      } catch (_) { }

      return NextResponse.json(
        {
          error: 'ROSTRO_DUPLICADO',
          message: 'Este rostro ya se encuentra registrado en el sistema y pertenece a otro funcionario. Si estás seguro de que se trata de otra persona, presiona "Forzar Enrolamiento".',
          empleado_duplicado: {
            id: emp.id,
            nombre: emp.nombre,
            apellido: emp.apellido,
            cedula: emp.cedula,
            departamento: emp.departamento,
            similitud,
          },
          distancia: mejorMatch.distanciaCentroide.toFixed(4),
          total_comparaciones: empleadosConRostro?.length || 0,
        },
        { status: 409 }
      );
    }

    // ─── 5. Advertencia de similitud alta (posibles gemelos) ─
    const esAdvertencia = mejorMatch && mejorMatch.distanciaCentroide < THRESHOLD_SOSPECHOSO;
    const advertencia = esAdvertencia
      ? {
        tipo: 'SIMILITUD_ALTA',
        message: `Alta similitud biométrica con ${mejorMatch!.empleado.nombre} ${mejorMatch!.empleado.apellido} (${Math.round((1 - mejorMatch!.distanciaCentroide / 2) * 100)}%). Registrado como excepción.`,
      }
      : null;

    // ─── 6. Obtener o Generar Código QR Único ──────────────
    const { data: currentEmp } = await supabaseGlobal
      .from('empleados')
      .select('qr_code, departamento, cargo, sede, foto_url')
      .eq('id', empleadoId)
      .single();

    let qrCodeFinal = currentEmp?.qr_code;
    let qrGeneradoAt = null;

    if (!qrCodeFinal) {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      qrCodeFinal = `EMPL-${randomHex}`;
      qrGeneradoAt = new Date().toISOString();
    }

    // ─── 7. Guardar embedding y QR (superó la verificación) ──
    const updatePayload: any = {
      face_descriptor: (face_descriptors && Array.isArray(face_descriptors) && face_descriptors.length > 0)
        ? face_descriptors
        : face_descriptor,
      updated_at: new Date().toISOString()
    };

    if (!currentEmp?.qr_code) {
      updatePayload.qr_code = qrCodeFinal;
      updatePayload.qr_generado_at = qrGeneradoAt;
    }

    const { data, error: saveError } = await supabaseGlobal
      .from('empleados')
      .update(updatePayload)
      .eq('id', empleadoId)
      .select('id, nombre, apellido, cedula, departamento, cargo, sede, qr_code, foto_url');

    if (saveError) {
      console.error('DB Save Error:', saveError);
      return NextResponse.json(
        { error: 'Error al guardar el perfil biométrico en la base de datos.' },
        { status: 500 }
      );
    }

    // Log de enrolamiento exitoso
    try {
      await supabaseGlobal.from('logs_auditoria').insert({
        tipo_evento: 'ENROLAMIENTO_FACIAL_EXITOSO',
        descripcion: `Rostro y QR (${qrCodeFinal}) enrolados correctamente para ${data?.[0]?.nombre} ${data?.[0]?.apellido}.`,
        tabla_afectada: 'empleados',
        registro_id: empleadoId,
      });
    } catch (_) { }

    return NextResponse.json({
      success: true,
      message: 'Perfil biométrico y código QR registrados exitosamente.',
      employee: data?.[0],
      total_comparaciones: empleadosConRostro?.length || 0,
      advertencia,
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
