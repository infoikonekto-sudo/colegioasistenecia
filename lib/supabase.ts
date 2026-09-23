import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    _supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});



// Función para autenticación
export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    // Intentar obtener la sesión local primero (más rápido y evita problemas al recargar)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return { user: session.user, error: null };
    }
    
    // Fallback a getUser si no hay sesión local (hace validación de red)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    return { data, error };
  },

  async getAdminProfile(email: string) {
    const emailLower = (email || '').toLowerCase().trim();
    if (!emailLower) return { data: null, error: null };
    
    // Asignación basada en sede con fallback seguro
    if (emailLower.includes('roos')) {
      return { data: { sede: 'ROOS' }, error: null };
    }
    if (emailLower.includes('caes')) {
      return { data: { sede: 'CAES' }, error: null };
    }

    return { data: null, error: null };
  },
};

// Función para obtener empleados
export const empleadosService = {
  async getAll(sede?: string, incluirInactivos = false) {
    let query = supabase.from('empleados').select('*');
    if (!incluirInactivos) {
      query = query.eq('activo', true);
    }
    if (sede) {
      if (sede.toUpperCase().includes('AMBA')) {
        query = query.in('sede', ['AMBAS', 'Ambas', 'ambas', 'AMBAS SEDES', 'Ambas Sedes']);
      } else {
        query = query.in('sede', [sede, sede.toLowerCase(), sede.toUpperCase(), 'AMBAS', 'Ambas', 'ambas', 'AMBAS SEDES', 'Ambas Sedes']);
      }
    }
    const { data, error } = await query.order('apellido', { ascending: true });
    return { data, error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async getByCedula(cedula: string) {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('cedula', cedula)
      .eq('activo', true)
      .single();
    return { data, error };
  },

  async getByQrCode(qrCode: string) {
    const codeClean = (qrCode || '').trim();
    if (!codeClean) return { data: null, error: new Error('Código QR no proporcionado') };

    // Intentar buscar por qr_code primero
    let { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('qr_code', codeClean)
      .eq('activo', true)
      .maybeSingle();

    // Fallback: Si no se encuentra por qr_code, intentar buscar por cédula
    if (!data) {
      const resultCedula = await supabase
        .from('empleados')
        .select('*')
        .eq('cedula', codeClean)
        .eq('activo', true)
        .maybeSingle();
      
      data = resultCedula.data;
      error = resultCedula.error;
    }

    return { data, error };
  },

  async create(empleado: any) {
    const payload = { ...empleado };
    if (!payload.qr_code) {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      payload.qr_code = `EMPL-${randomHex}`;
    }
    const { data, error } = await supabase
      .from('empleados')
      .insert([payload])
      .select()
      .single();
    return { data, error };
  },

  async createBulk(empleados: any[]) {
    const payload = empleados.map(emp => ({
      ...emp,
      qr_code: emp.qr_code || `EMPL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    }));
    const { data, error } = await supabase
      .from('empleados')
      .upsert(payload, { onConflict: 'cedula' })
      .select();
    return { data, error };
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('empleados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async updateFaceDescriptor(id: string, descriptor: number[] | number[][] | any) {
    const { data, error } = await supabase
      .from('empleados')
      .update({ face_descriptor: descriptor, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data: data?.[0] || null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id);
    return { error };
  },

};

// Función para marcajes
export const marcajesService = {
  async create(marcaje: any) {
    const { data, error } = await supabase
      .from('marcajes')
      .insert([marcaje])
      .select()
      .single();
    return { data, error };
  },

  async getByEmpleadoAndFecha(empleadoId: string, fecha: string) {
    const { data, error } = await supabase
      .from('marcajes')
      .select('*')
      .eq('empleado_id', empleadoId)
      .eq('fecha', fecha)
      .order('timestamp', { ascending: true });
    return { data, error };
  },

  async getByFecha(fecha: string, sede?: string, soloEntrada = false) {
    let query = supabase
      .from('marcajes')
      .select('*, empleado:empleado_id(id, nombre, apellido, departamento, cargo, sede)')
      .eq('fecha', fecha);

    if (soloEntrada) {
      query = query.eq('tipo', 'entrada');
    }
      
    if (sede && !sede.toUpperCase().includes('AMBA')) {
      const { data: empls } = await empleadosService.getAll(sede, true);
      const empIds = (empls || []).map(e => e.id);
      if (empIds.length === 0) return { data: [], error: null };
      query = query.in('empleado_id', empIds);
    }
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    return { data, error };
  },

  async getByEmpleadoAndRango(empleadoId: string, fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('marcajes')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('timestamp', { ascending: false });
    return { data, error };
  },

  async getSincronizarPendientes() {
    const { data, error } = await supabase
      .from('marcajes')
      .select('*')
      .eq('sincronizado', false);
    return { data, error };
  },

  async marcarSincronizado(ids: string[]) {
    const { error } = await supabase
      .from('marcajes')
      .update({ sincronizado: true })
      .in('id', ids);
    return { error };
  },

  async getByRango(fechaInicio: string, fechaFin: string, sede?: string) {
    let query = supabase
      .from('marcajes')
      .select('*, empleado:empleado_id(id, nombre, apellido, departamento, cargo, cedula, sede)')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (sede && !sede.toUpperCase().includes('AMBA')) {
      const { data: empls } = await empleadosService.getAll(sede, true);
      const empIds = (empls || []).map(e => e.id);
      if (empIds.length === 0) return { data: [], error: null };
      query = query.in('empleado_id', empIds);
    }

    const { data, error } = await query
      .order('fecha', { ascending: false })
      .order('timestamp', { ascending: false });
    return { data, error };
  },
};

// Función para justificaciones
export const justificacionesService = {
  async create(justificacion: any) {
    const { data, error } = await supabase
      .from('justificaciones')
      .insert([justificacion])
      .select()
      .single();
    return { data, error };
  },

  async getPendientes() {
    const { data, error } = await supabase
      .from('justificaciones')
      .select('*, empleado:empleado_id(nombre, apellido, cedula)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getByEmpleado(empleadoId: string) {
    const { data, error } = await supabase
      .from('justificaciones')
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getByRango(fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('justificaciones')
      .select('*, empleado:empleado_id(id, nombre, apellido, departamento, cargo, cedula)')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async aprobar(id: string, aprobadoPorId: string) {
    const { data, error } = await supabase
      .from('justificaciones')
      .update({ estado: 'aprobada', aprobado_por: aprobadoPorId })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async rechazar(id: string) {
    const { data, error } = await supabase
      .from('justificaciones')
      .update({ estado: 'rechazada' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async upsertDiario(empleado_id: string, fecha: string, motivo: string, observaciones?: string) {
    const { data: existentes } = await supabase
      .from('justificaciones')
      .select('id')
      .eq('empleado_id', empleado_id)
      .eq('fecha', fecha);

    if (existentes && existentes.length > 0) {
      const { data, error } = await supabase
        .from('justificaciones')
        .update({
          fecha,
          motivo,
          observaciones: observaciones || null,
          estado: 'aprobada'
        })
        .eq('id', existentes[0].id)
        .select();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('justificaciones')
        .insert([{
          empleado_id,
          fecha,
          motivo,
          observaciones: observaciones || null,
          estado: 'aprobada'
        }])
        .select();
      return { data, error };
    }
  }
};

// Función para configuración
export const configuracionService = {
  async get(clave: string) {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', clave)
      .maybeSingle();
    return { data, error };
  },

  async set(clave: string, valor: any, descripcion?: string) {
    const { data: existing } = await this.get(clave);

    if (existing) {
      const { data, error } = await supabase
        .from('configuracion')
        .update({ valor })
        .eq('clave', clave)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('configuracion')
        .insert([{ clave, valor, descripcion }])
        .select()
        .single();
      return { data, error };
    }
  },
};

// Storage
export const storageService = {
  async uploadEmpleadoFoto(empleadoId: string, file: File) {
    const randomHash = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const fileName = `${empleadoId}-${randomHash}-${Date.now()}`;
    const { data, error } = await supabase.storage
      .from('empleados-fotos')
      .upload(`${empleadoId}/${fileName}`, file);

    if (error) return { url: null, error };

    const { data: urlData } = supabase.storage
      .from('empleados-fotos')
      .getPublicUrl(`${empleadoId}/${fileName}`);

    return { url: urlData?.publicUrl, error: null };
  },

  async uploadMarcajeFoto(marcajeId: string, file: File) {
    const randomHash = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const fileName = `${marcajeId}-${randomHash}-${Date.now()}`;
    const { data, error } = await supabase.storage
      .from('marcajes-fotos')
      .upload(`${marcajeId}/${fileName}`, file);

    if (error) return { url: null, error };

    const { data: urlData } = supabase.storage
      .from('marcajes-fotos')
      .getPublicUrl(`${marcajeId}/${fileName}`);

    return { url: urlData?.publicUrl, error: null };
  },
};

export const inventarioItemsService = {
  async getAll(sede?: string) {
    let query = supabase.from('inventario_items').select('*').eq('activo', true);
    if (sede && !sede.toUpperCase().includes('AMBA')) {
      query = query.in('sede', [sede, sede.toLowerCase(), sede.toUpperCase(), 'AMBAS', 'Ambas', 'ambas', 'AMBAS SEDES', 'Ambas Sedes']);
    }
    const { data, error } = await query.order('categoria', { ascending: true }).order('nombre', { ascending: true });
    return { data, error };
  },

  async create(item: any) {
    const { data, error } = await supabase.from('inventario_items').insert([item]).select().single();
    return { data, error };
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('inventario_items').update(updates).eq('id', id).select().single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase.from('inventario_items').update({ activo: false }).eq('id', id);
    return { error };
  }
};

export const inventarioMovimientosService = {
  async getByItem(itemId: string) {
    const { data, error } = await supabase
      .from('inventario_movimientos')
      .select('*, empleado:empleados(nombre, apellido)')
      .eq('item_id', itemId)
      .order('fecha', { ascending: false });
    return { data, error };
  },

  async getRecientes(sede?: string, limit = 50) {
    let query = supabase
      .from('inventario_movimientos')
      .select('*, item:inventario_items!inner(nombre, categoria, sede), empleado:empleados(nombre, apellido)')
      .order('fecha', { ascending: false })
      .limit(limit);
      
    if (sede && !sede.toUpperCase().includes('AMBA')) {
      query = query.in('item.sede', [sede, sede.toLowerCase(), sede.toUpperCase(), 'AMBAS', 'Ambas', 'ambas', 'AMBAS SEDES', 'Ambas Sedes']);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  async registrarMovimiento(movimiento: any) {
    // Validar stock antes de registrar salida
    const { data: item } = await supabase.from('inventario_items').select('stock_actual').eq('id', movimiento.item_id).single();
    if (movimiento.tipo === 'salida') {
      const stockActual = item?.stock_actual || 0;
      if (stockActual < movimiento.cantidad) {
        return { data: null, error: { message: `Stock insuficiente. Disponible: ${stockActual}, solicitado: ${movimiento.cantidad}` } };
      }
    }

    // Registrar el movimiento
    const { data: movData, error: movError } = await supabase
      .from('inventario_movimientos')
      .insert([movimiento])
      .select()
      .single();

    if (movError) return { data: null, error: movError };

    // Actualizar el stock actual del item
    if (item) {
      const nuevoStock = movimiento.tipo === 'entrada' 
        ? item.stock_actual + movimiento.cantidad 
        : Math.max(0, item.stock_actual - movimiento.cantidad);
        
      await supabase.from('inventario_items').update({ stock_actual: nuevoStock }).eq('id', movimiento.item_id);
    }

    return { data: movData, error: null };
  }
};

// Servicios para Áreas
export const areasService = {
  async getAll() {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    return { data, error };
  },

  async create(area: any) {
    const { data, error } = await supabase
      .from('areas')
      .insert([area])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('areas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('areas')
      .update({ activo: false })
      .eq('id', id);
    return { error };
  }
};

// Servicios para Configuración de Horarios
export const configHorariosService = {
  async getAll() {
    const { data, error } = await supabase
      .from('config_horarios')
      .select('*, area:area_id(id, nombre)')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getByArea(areaId?: string) {
    let query = supabase.from('config_horarios').select('*').eq('activo', true);
    if (areaId) {
      query = query.or(`area_id.eq.${areaId},area_id.is.null`);
    } else {
      query = query.is('area_id', null);
    }
    const { data, error } = await query;
    return { data, error };
  },

  async create(config: any) {
    const { data, error } = await supabase
      .from('config_horarios')
      .insert([config])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('config_horarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('config_horarios')
      .update({ activo: false })
      .eq('id', id);
    return { error };
  }
};

// Servicios para Días de Descanso y Festivos
export const configDescansosService = {
  async getAll() {
    const { data, error } = await supabase
      .from('config_descansos')
      .select('*, area:area_id(id, nombre)')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async create(descanso: any) {
    const { data, error } = await supabase
      .from('config_descansos')
      .insert([descanso])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('config_descansos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('config_descansos')
      .update({ activo: false })
      .eq('id', id);
    return { error };
  }
};

// Servicios para Auditoría de Intentos Fallidos
export const marcajesFallidosService = {
  async create(intento: any) {
    const { data, error } = await supabase
      .from('marcajes_fallidos')
      .insert([intento])
      .select()
      .single();
    return { data, error };
  },

  async getRecientes(limit = 50) {
    const { data, error } = await supabase
      .from('marcajes_fallidos')
      .select('*, empleado:empleado_id(id, nombre, apellido, departamento, cedula)')
      .order('timestamp', { ascending: false })
      .limit(limit);
    return { data, error };
  }
};
