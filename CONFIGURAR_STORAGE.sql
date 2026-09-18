-- ========================================================================
-- SCRIPT DE CONFIGURACIÓN DE STORAGE (BUCKETS)
-- ========================================================================
-- Este script crea los buckets necesarios para las fotos de perfil,
-- fotos de marcajes y evidencias, y establece las políticas públicas 
-- para permitir la subida desde la app y la lectura sin errores.
-- ========================================================================

-- 1. Crear los buckets si no existen en la tabla de storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('empleados-fotos', 'empleados-fotos', true),
  ('marcajes-fotos', 'marcajes-fotos', true),
  ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas anteriores (si las hubiera) para evitar duplicados
DROP POLICY IF EXISTS "Permitir lectura pública empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update empleados-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete empleados-fotos" ON storage.objects;

DROP POLICY IF EXISTS "Permitir lectura pública marcajes-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida marcajes-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update marcajes-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete marcajes-fotos" ON storage.objects;

DROP POLICY IF EXISTS "Permitir lectura pública evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete evidencias" ON storage.objects;

-- 3. Crear políticas para "empleados-fotos"
CREATE POLICY "Permitir lectura pública empleados-fotos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'empleados-fotos');

CREATE POLICY "Permitir subida empleados-fotos"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'empleados-fotos');

CREATE POLICY "Permitir update empleados-fotos"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'empleados-fotos');

CREATE POLICY "Permitir delete empleados-fotos"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'empleados-fotos');

-- 4. Crear políticas para "marcajes-fotos"
CREATE POLICY "Permitir lectura pública marcajes-fotos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'marcajes-fotos');

CREATE POLICY "Permitir subida marcajes-fotos"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'marcajes-fotos');

CREATE POLICY "Permitir update marcajes-fotos"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'marcajes-fotos');

CREATE POLICY "Permitir delete marcajes-fotos"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'marcajes-fotos');

-- 5. Crear políticas para "evidencias"
CREATE POLICY "Permitir lectura pública evidencias"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'evidencias');

CREATE POLICY "Permitir subida evidencias"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'evidencias');

CREATE POLICY "Permitir update evidencias"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'evidencias');

CREATE POLICY "Permitir delete evidencias"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'evidencias');

-- FIN DEL SCRIPT
