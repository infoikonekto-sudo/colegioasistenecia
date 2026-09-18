-- ============================================
-- SCRIPT DE ACTUALIZACIÓN Y CORRECCIÓN: SEDES
-- ============================================

-- PASO 1: Asegurarse de que la columna 'sede' existe en usuarios_admin
ALTER TABLE usuarios_admin ADD COLUMN IF NOT EXISTS sede VARCHAR(20);

-- PASO 2: Asignar los correos a sus sedes
INSERT INTO usuarios_admin (email, nombre, rol, sede)
VALUES 
  ('adminroos@mao.com', 'Admin Roos', 'rrhh', 'ROOS'),
  ('admincaes@mao.com', 'Admin CAES', 'rrhh', 'CAES')
ON CONFLICT (email) 
DO UPDATE SET sede = EXCLUDED.sede;

-- PASO 3: (CORRECCIÓN IMPORTANTE) Permitir que la app lea esta tabla
-- Si no ejecutamos esto, la app no puede ver a qué sede pertenece el administrador.
DROP POLICY IF EXISTS "usuarios_admin_select" ON usuarios_admin;
CREATE POLICY "usuarios_admin_select" ON usuarios_admin FOR SELECT USING (auth.role() = 'authenticated');
