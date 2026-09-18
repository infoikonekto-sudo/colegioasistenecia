-- ============================================
-- SISTEMA DE ASISTENCIA BIOMÉTRICA
-- Colegio Manos a la Obra
-- Schema SQL para Supabase
-- ============================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- TABLA: empleados
-- ============================================
CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  cedula VARCHAR(20) UNIQUE NOT NULL,
  departamento VARCHAR(50),
  cargo VARCHAR(50),
  foto_url TEXT,
  face_descriptor JSONB,
  horario_entrada TIME DEFAULT '08:00:00',
  tolerancia_minutos INTEGER DEFAULT 15,
  email VARCHAR(100),
  telefono VARCHAR(20),
  sede VARCHAR(20) DEFAULT 'ROOS',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asegurar que la columna sede existe si la tabla ya fue creada
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS sede VARCHAR(20) DEFAULT 'ROOS';

CREATE INDEX IF NOT EXISTS idx_empleados_cedula ON empleados(cedula);
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo);
CREATE INDEX IF NOT EXISTS idx_empleados_departamento ON empleados(departamento);

-- ============================================
-- TABLA: marcajes
-- ============================================
CREATE TABLE IF NOT EXISTS marcajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
  tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'salida')),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  punto_marcaje VARCHAR(20),
  ipad_id VARCHAR(20),
  foto_marcaje_url TEXT,
  confianza DECIMAL(5,2),
  latitud DECIMAL(10,8),
  longitud DECIMAL(11,8),
  sede VARCHAR(20) DEFAULT 'ROOS',
  sincronizado BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asegurar que la columna sede existe si la tabla ya fue creada
ALTER TABLE marcajes ADD COLUMN IF NOT EXISTS sede VARCHAR(20) DEFAULT 'ROOS';

CREATE INDEX IF NOT EXISTS idx_marcajes_empleado ON marcajes(empleado_id);
CREATE INDEX IF NOT EXISTS idx_marcajes_fecha ON marcajes(fecha);
CREATE INDEX IF NOT EXISTS idx_marcajes_tipo ON marcajes(tipo);
CREATE INDEX IF NOT EXISTS idx_marcajes_sincronizado ON marcajes(sincronizado);
CREATE INDEX IF NOT EXISTS idx_marcajes_timestamp ON marcajes(timestamp);
CREATE INDEX IF NOT EXISTS idx_marcajes_empleado_fecha ON marcajes(empleado_id, fecha);

-- ============================================
-- TABLA: justificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS justificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  motivo TEXT NOT NULL,
  documento_url TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES empleados(id) ON DELETE SET NULL,
  comentario_rrhh TEXT,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_justificaciones_empleado ON justificaciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_justificaciones_estado ON justificaciones(estado);
CREATE INDEX IF NOT EXISTS idx_justificaciones_fecha ON justificaciones(fecha);

-- ============================================
-- TABLA: usuarios_admin
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(100) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) CHECK (rol IN ('super_admin', 'rrhh', 'supervisor')),
  departamento VARCHAR(50),
  sede VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_admin_email ON usuarios_admin(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_rol ON usuarios_admin(rol);

-- ============================================
-- TABLA: configuracion
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave VARCHAR(50) UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: logs_auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID,
  tipo_evento VARCHAR(50),
  descripcion TEXT,
  tabla_afectada VARCHAR(50),
  registro_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_tipo ON logs_auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_fecha ON logs_auditoria(created_at);

-- ============================================
-- INSERTS INICIALES
-- ============================================

-- Configuraciones por defecto
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('horario_entrada', '{"hora": "08:00:00", "tolerancia": 15}', 'Horario de entrada estándar'),
('puntos_marcaje', '["Puerta 1", "Puerta 2", "Puerta 3", "Oficina"]', 'Puntos de marcaje disponibles'),
('umbral_reconocimiento', '{"confianza_minima": 0.6}', 'Umbral de confianza facial'),
('configuracion_general', '{"nombre_institucion": "Colegio Manos a la Obra", "pais": "Ecuador", "ciudad": "Ambato"}', 'Configuración general del sistema')
ON CONFLICT (clave) DO NOTHING;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_empleados_updated_at ON empleados;
CREATE TRIGGER update_empleados_updated_at BEFORE UPDATE ON empleados
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_justificaciones_updated_at ON justificaciones;
CREATE TRIGGER update_justificaciones_updated_at BEFORE UPDATE ON justificaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_admin_updated_at ON usuarios_admin;
CREATE TRIGGER update_usuarios_admin_updated_at BEFORE UPDATE ON usuarios_admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular estadísticas del día
CREATE OR REPLACE FUNCTION obtener_estadisticas_dia(fecha DATE)
RETURNS TABLE (
  total_empleados BIGINT,
  presentes BIGINT,
  retardos BIGINT,
  ausentes BIGINT,
  porcentaje_asistencia NUMERIC
) AS $$
DECLARE
  v_total INTEGER;
  v_presentes INTEGER;
  v_retardos INTEGER;
BEGIN
  -- Contar total de empleados activos
  SELECT COUNT(*) INTO v_total FROM empleados WHERE activo = true;
  
  -- Contar presentes (tienen entrada del día)
  SELECT COUNT(DISTINCT empleado_id) INTO v_presentes 
  FROM marcajes 
  WHERE fecha = $1 AND tipo = 'entrada';
  
  -- Contar retardos
  SELECT COUNT(DISTINCT m.empleado_id) INTO v_retardos
  FROM marcajes m
  JOIN empleados e ON m.empleado_id = e.id
  WHERE m.fecha = $1 
    AND m.tipo = 'entrada'
    AND CAST(m.hora AS TIME) > (CAST(e.horario_entrada AS TIME) + (e.tolerancia_minutos || ' minutes')::INTERVAL);
  
  RETURN QUERY SELECT 
    v_total::BIGINT,
    v_presentes::BIGINT,
    v_retardos::BIGINT,
    (v_total - v_presentes)::BIGINT,
    CASE WHEN v_total > 0 THEN ROUND(((v_presentes::NUMERIC / v_total) * 100), 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para empleados (lectura pública, escritura solo admin)
DROP POLICY IF EXISTS "empleados_select" ON empleados;
CREATE POLICY "empleados_select" ON empleados FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "empleados_insert" ON empleados;
CREATE POLICY "empleados_insert" ON empleados FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "empleados_update" ON empleados;
CREATE POLICY "empleados_update" ON empleados FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "empleados_delete" ON empleados;
CREATE POLICY "empleados_delete" ON empleados FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para marcajes (lectura solo admin, escritura solo sistema)
DROP POLICY IF EXISTS "marcajes_select" ON marcajes;
CREATE POLICY "marcajes_select" ON marcajes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "marcajes_insert" ON marcajes;
CREATE POLICY "marcajes_insert" ON marcajes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "marcajes_update" ON marcajes;
CREATE POLICY "marcajes_update" ON marcajes FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para logs de auditoría (lectura solo admin)
DROP POLICY IF EXISTS "logs_auditoria_select" ON logs_auditoria;
CREATE POLICY "logs_auditoria_select" ON logs_auditoria FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para usuarios_admin
DROP POLICY IF EXISTS "usuarios_admin_select" ON usuarios_admin;
CREATE POLICY "usuarios_admin_select" ON usuarios_admin FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Asistencia de hoy con detalles
DROP VIEW IF EXISTS asistencia_diaria_detallada CASCADE;
CREATE OR REPLACE VIEW asistencia_diaria_detallada AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.cedula,
  e.departamento,
  e.cargo,
  e.sede,
  e.foto_url,
  e.horario_entrada,
  e.tolerancia_minutos,
  m.fecha,
  m.hora,
  m.tipo,
  m.punto_marcaje,
  m.confianza,
  m.timestamp,
  m.sede as sede_marcaje,
  CASE 
    WHEN m.hora IS NULL THEN 'Ausente'
    WHEN CAST(m.hora AS TIME) <= (CAST(e.horario_entrada AS TIME) + (e.tolerancia_minutos || ' minutes')::INTERVAL) THEN 'Puntual'
    ELSE 'Retardo'
  END AS estado_asistencia,
  CASE 
    WHEN m.hora IS NULL THEN 0
    WHEN CAST(m.hora AS TIME) > (CAST(e.horario_entrada AS TIME) + (e.tolerancia_minutos || ' minutes')::INTERVAL) 
      THEN EXTRACT(EPOCH FROM (CAST(m.hora AS TIME) - (CAST(e.horario_entrada AS TIME) + (e.tolerancia_minutos || ' minutes')::INTERVAL))) / 60
    ELSE 0
  END AS minutos_retardo
FROM empleados e
LEFT JOIN marcajes m ON e.id = m.empleado_id AND m.fecha = CURRENT_DATE AND m.tipo = 'entrada'
WHERE e.activo = true
ORDER BY e.apellido, e.nombre;

-- Vista: Resumen mensual
DROP VIEW IF EXISTS resumen_mensual CASCADE;
CREATE OR REPLACE VIEW resumen_mensual AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.cedula,
  e.departamento,
  COUNT(CASE WHEN m.tipo = 'entrada' THEN 1 END) as dias_asistencia,
  COUNT(CASE WHEN m.tipo = 'entrada' AND CAST(m.hora AS TIME) > (CAST(e.horario_entrada AS TIME) + (e.tolerancia_minutos || ' minutes')::INTERVAL) THEN 1 END) as dias_retardo,
  SUM(CASE WHEN m.tipo = 'entrada' THEN 1 ELSE 0 END) FILTER (WHERE EXTRACT(MONTH FROM m.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)) as horas_trabajadas
FROM empleados e
LEFT JOIN marcajes m ON e.id = m.empleado_id AND m.tipo = 'entrada'
WHERE e.activo = true
GROUP BY e.id, e.nombre, e.apellido, e.cedula, e.departamento;

-- ============================================
-- TABLA: inventario_items
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  talla_o_medida VARCHAR(50),
  proveedor VARCHAR(150),
  descripcion TEXT,
  stock_actual INTEGER DEFAULT 0,
  sede VARCHAR(20) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_items_sede ON inventario_items(sede);
CREATE INDEX IF NOT EXISTS idx_inventario_items_categoria ON inventario_items(categoria);

-- ============================================
-- TABLA: inventario_movimientos
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES inventario_items(id) ON DELETE CASCADE,
  tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL,
  empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL,
  departamento VARCHAR(50),
  fecha TIMESTAMP DEFAULT NOW(),
  notas TEXT,
  usuario_admin_id UUID REFERENCES usuarios_admin(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_item ON inventario_movimientos(item_id);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_fecha ON inventario_movimientos(fecha);

-- RLS para Inventarios
ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventario_items_select" ON inventario_items;
CREATE POLICY "inventario_items_select" ON inventario_items FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "inventario_items_all" ON inventario_items;
CREATE POLICY "inventario_items_all" ON inventario_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "inventario_movimientos_select" ON inventario_movimientos;
CREATE POLICY "inventario_movimientos_select" ON inventario_movimientos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "inventario_movimientos_all" ON inventario_movimientos;
CREATE POLICY "inventario_movimientos_all" ON inventario_movimientos FOR ALL USING (auth.role() = 'authenticated');

-- Trigger updated_at para inventario_items
DROP TRIGGER IF EXISTS update_inventario_items_updated_at ON inventario_items;
CREATE TRIGGER update_inventario_items_updated_at BEFORE UPDATE ON inventario_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
