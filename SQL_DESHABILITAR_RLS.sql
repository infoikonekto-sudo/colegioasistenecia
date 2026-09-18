-- ====================================
-- 🔓 DESHABILITAR RLS - Supabase
-- ====================================
-- Ejecuta este script en: Supabase Dashboard → SQL Editor
-- Resultado: La tabla 'empleados' permitirá inserciones sin restricciones

-- Deshabilitar RLS en la tabla empleados
ALTER TABLE empleados DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'empleados';

-- Verificar que no hay policies conflictivas
SELECT * FROM pg_policies 
WHERE tablename = 'empleados';

-- ====================================
-- ✅ Resultado esperado:
-- empleados | false    ← RLS está DESHABILITADO
-- (sin policies conflictivas)
-- ====================================
