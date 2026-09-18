-- ============================================================
-- MIGRACIÓN REDISEÑO SISTEMA DE ASISTENCIA (QR + ROSTRO 1:1)
-- ============================================================

-- 1. Agregar QR code a la tabla empleados
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS qr_code VARCHAR(64) UNIQUE;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS qr_generado_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_empleados_qr ON empleados(qr_code);

-- 2. Tabla de áreas (normalización de departamentos)
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(80) UNIQUE NOT NULL,
  sede VARCHAR(20) DEFAULT 'ROOS',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar FK de area_id a empleados
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_empleados_area_id ON empleados(area_id);

-- 3. Tabla de configuración de horarios por área
CREATE TABLE IF NOT EXISTS config_horarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE, -- NULL = aplica globalmente a todas las áreas
  hora_entrada TIME NOT NULL DEFAULT '08:00:00',
  hora_receso_inicio TIME,
  hora_receso_fin TIME,
  hora_salida TIME NOT NULL DEFAULT '17:00:00',
  tolerancia_minutos INTEGER DEFAULT 15,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_horarios_area ON config_horarios(area_id);

-- 4. Tabla de configuración de días y períodos de descanso / festivos
CREATE TABLE IF NOT EXISTS config_descansos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE, -- NULL = aplica globalmente
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('dia_semana', 'fecha_fija', 'rango_fechas')),
  dia_semana INTEGER,        -- 0 = Domingo, 1 = Lunes ... 6 = Sábado
  fecha_inicio DATE,         -- Para fecha_fija o inicio de rango
  fecha_fin DATE,            -- Para fin de rango de fechas
  descripcion VARCHAR(150),  -- ej. "Vacaciones de Diciembre", "Descanso Semanal"
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_descansos_area ON config_descansos(area_id);

-- 5. Actualizar la tabla marcajes con trazabilidad de QR y método
ALTER TABLE marcajes ADD COLUMN IF NOT EXISTS qr_escaneado VARCHAR(64);
ALTER TABLE marcajes ADD COLUMN IF NOT EXISTS metodo_verificacion VARCHAR(20) DEFAULT 'qr_rostro';

-- 6. Tabla de auditoría de intentos fallidos de marcaje
CREATE TABLE IF NOT EXISTS marcajes_fallidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL,
  qr_escaneado VARCHAR(64),
  distancia_facial DECIMAL(5,4),
  foto_intento_url TEXT,
  punto_marcaje VARCHAR(20),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marcajes_fallidos_empleado ON marcajes_fallidos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_marcajes_fallidos_timestamp ON marcajes_fallidos(timestamp);

-- 7. Poblar la tabla de áreas con los departamentos únicos existentes
INSERT INTO areas (nombre)
SELECT DISTINCT departamento 
FROM empleados 
WHERE departamento IS NOT NULL AND departamento != ''
ON CONFLICT (nombre) DO NOTHING;

-- Relacionar empleados con la tabla areas basada en su departamento actual
UPDATE empleados 
SET area_id = areas.id 
FROM areas 
WHERE empleados.departamento = areas.nombre 
  AND empleados.area_id IS NULL;
