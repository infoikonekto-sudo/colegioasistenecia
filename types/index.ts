// Tipos para la aplicación de asistencia

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  departamento: string;
  subarea?: string;
  area_id?: string;
  cargo: string;
  email?: string;
  foto_url?: string;
  face_descriptor?: number[];
  face_variabilidad?: number;
  face_samples?: number;
  face_confidence?: number;
  qr_code?: string;
  qr_generado_at?: string;
  sede?: string;
  horario_entrada: string;
  tolerancia_minutos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Marcaje {
  id: string;
  empleado_id: string;
  tipo: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  timestamp: string;
  punto_marcaje: string;
  ipad_id: string;
  foto_marcaje_url?: string;
  confianza: number;
  latitud?: number;
  longitud?: number;
  sede?: string;
  qr_escaneado?: string;
  metodo_verificacion?: string;
  notas?: string;
  sincronizado: boolean;
  created_at: string;
  empleado?: Empleado;
}

export interface Area {
  id: string;
  nombre: string;
  sede?: string;
  activo: boolean;
  created_at?: string;
}

export interface ConfigHorario {
  id: string;
  area_id?: string | null;
  hora_entrada: string;
  hora_receso_inicio?: string;
  hora_receso_fin?: string;
  hora_salida: string;
  tolerancia_minutos: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  area?: Area;
}

export interface ConfigDescanso {
  id: string;
  area_id?: string | null;
  tipo: 'dia_semana' | 'fecha_fija' | 'rango_fechas';
  dia_semana?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
  area?: Area;
}

export interface MarcajeFallido {
  id: string;
  empleado_id?: string;
  qr_escaneado?: string;
  distancia_facial?: number;
  foto_intento_url?: string;
  punto_marcaje?: string;
  timestamp: string;
  empleado?: Empleado;
}

export interface Justificacion {
  id: string;
  empleado_id: string;
  fecha: string;
  motivo: string;
  documento_url?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  aprobado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: 'super_admin' | 'rrhh' | 'supervisor';
  departamento?: string;
  activo: boolean;
  created_at: string;
}

export interface Configuracion {
  id: string;
  clave: string;
  valor: Record<string, any>;
  descripcion?: string;
  updated_at: string;
}

export interface ResultadoMarcaje {
  exito: boolean;
  mensaje: string;
  empleado?: Empleado;
  marcaje?: Marcaje;
  error?: string;
  confianza?: number;
}

export interface EstadisticasAsistencia {
  fecha: string;
  totalEmpleados: number;
  presentes: number;
  retardos: number;
  ausentes: number;
  porcentajeAsistencia: number;
  por_departamento: {
    [departamento: string]: {
      total: number;
      presentes: number;
      retardos: number;
      ausentes: number;
    };
  };
}

export interface PuntoMarcaje {
  id: string;
  nombre: string;
  ubicacion: string;
  ipadId: string;
  activo: boolean;
}

export interface FaceDetectionResult {
  detection?: {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  descriptor?: Float32Array;
  score?: number;
}

export interface InventarioItem {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  stock_actual: number;
  stock_minimo?: number;
  unidad_medida: string;
  codigo?: string;
  ubicacion?: string;
  sede?: string;
  precio_unitario?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventarioMovimiento {
  id: string;
  item_id: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  empleado_id?: string;
  motivo?: string;
  referencia?: string;
  fecha: string;
  created_at: string;
  item?: InventarioItem;
  empleado?: Empleado;
}
