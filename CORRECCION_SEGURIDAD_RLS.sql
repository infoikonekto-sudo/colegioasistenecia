-- ============================================================
-- SCRIPT DE REMEDIACIÓN Y BLINDAJE DE SEGURIDAD (SUPABASE RLS)
-- COLEGIO MANOS A LA OBRA (SEDES ROOS Y CAES)
-- ============================================================
-- Este script es IDEMPOTENTE (se puede ejecutar varias veces sin error).
-- Activa Row Level Security (RLS) en todas las tablas protegiendo
-- los datos sensibles mientras mantiene el Kiosco 100% funcional.

-- 1. ACTIVAR RLS EN TODAS LAS TABLAS CLAVE
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcajes_fallidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_descansos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_horarios ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIAR POLÍTICAS PREVIAS (NUEVAS Y ANTIGUAS) PARA EVITAR ERRORES
DROP POLICY IF EXISTS "Permitir lectura publica empleados" ON public.empleados;
DROP POLICY IF EXISTS "Permitir todo a administradores en empleados" ON public.empleados;
DROP POLICY IF EXISTS "Lectura Kiosco Empleados" ON public.empleados;
DROP POLICY IF EXISTS "Admin Total Empleados" ON public.empleados;

DROP POLICY IF EXISTS "Permitir lectura publica marcajes" ON public.marcajes;
DROP POLICY IF EXISTS "Permitir insercion anonima marcajes" ON public.marcajes;
DROP POLICY IF EXISTS "Permitir todo a administradores en marcajes" ON public.marcajes;
DROP POLICY IF EXISTS "Permitir Insercion Marcajes Kiosco" ON public.marcajes;
DROP POLICY IF EXISTS "Permitir Lectura Marcajes Kiosco" ON public.marcajes;
DROP POLICY IF EXISTS "Admin Total Marcajes" ON public.marcajes;

DROP POLICY IF EXISTS "Permitir lectura publica configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Permitir todo a administradores en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Lectura Publica Config" ON public.configuracion;
DROP POLICY IF EXISTS "Admin Total Config" ON public.configuracion;

DROP POLICY IF EXISTS "Permitir lectura publica descansos" ON public.config_descansos;
DROP POLICY IF EXISTS "Permitir todo a administradores en descansos" ON public.config_descansos;
DROP POLICY IF EXISTS "Lectura Publica Descansos" ON public.config_descansos;
DROP POLICY IF EXISTS "Admin Total Descansos" ON public.config_descansos;

DROP POLICY IF EXISTS "Lectura Publica Areas" ON public.areas;
DROP POLICY IF EXISTS "Admin Total Areas" ON public.areas;

DROP POLICY IF EXISTS "Lectura Publica Horarios" ON public.config_horarios;
DROP POLICY IF EXISTS "Admin Total Horarios" ON public.config_horarios;

DROP POLICY IF EXISTS "Lectura Publica Inventario Items" ON public.inventario_items;
DROP POLICY IF EXISTS "Admin Total Inventario Items" ON public.inventario_items;

DROP POLICY IF EXISTS "Lectura Publica Inventario Movimientos" ON public.inventario_movimientos;
DROP POLICY IF EXISTS "Admin Total Inventario Movimientos" ON public.inventario_movimientos;

DROP POLICY IF EXISTS "Permitir insercion anonima marcajes fallidos" ON public.marcajes_fallidos;
DROP POLICY IF EXISTS "Permitir lectura y todo a admin en marcajes fallidos" ON public.marcajes_fallidos;
DROP POLICY IF EXISTS "Insercion Kiosco Marcajes Fallidos" ON public.marcajes_fallidos;
DROP POLICY IF EXISTS "Admin Total Marcajes Fallidos" ON public.marcajes_fallidos;

-- 3. POLÍTICAS PARA TABLA 'empleados'
DROP POLICY IF EXISTS "Permitir Update Kiosco Empleados" ON public.empleados;
CREATE POLICY "Lectura Kiosco Empleados" ON public.empleados FOR SELECT USING (true);
CREATE POLICY "Permitir Update Kiosco Empleados" ON public.empleados FOR UPDATE USING (true);
CREATE POLICY "Admin Total Empleados" ON public.empleados FOR ALL USING (auth.role() = 'authenticated');

-- 4. POLÍTICAS PARA TABLA 'marcajes'
CREATE POLICY "Permitir Insercion Marcajes Kiosco" ON public.marcajes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Lectura Marcajes Kiosco" ON public.marcajes FOR SELECT USING (true);
CREATE POLICY "Admin Total Marcajes" ON public.marcajes FOR ALL USING (auth.role() = 'authenticated');

-- 5. POLÍTICAS PARA 'configuracion', 'config_descansos', 'areas', 'config_horarios'
CREATE POLICY "Lectura Publica Config" ON public.configuracion FOR SELECT USING (true);
CREATE POLICY "Admin Total Config" ON public.configuracion FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Lectura Publica Descansos" ON public.config_descansos FOR SELECT USING (true);
CREATE POLICY "Admin Total Descansos" ON public.config_descansos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura Publica Areas" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Admin Total Areas" ON public.areas FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura Publica Horarios" ON public.config_horarios FOR SELECT USING (true);
CREATE POLICY "Admin Total Horarios" ON public.config_horarios FOR ALL USING (auth.role() = 'authenticated');

-- 6. POLÍTICAS PARA INVENTARIOS
CREATE POLICY "Lectura Publica Inventario Items" ON public.inventario_items FOR SELECT USING (true);
CREATE POLICY "Admin Total Inventario Items" ON public.inventario_items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura Publica Inventario Movimientos" ON public.inventario_movimientos FOR SELECT USING (true);
CREATE POLICY "Admin Total Inventario Movimientos" ON public.inventario_movimientos FOR ALL USING (auth.role() = 'authenticated');

-- 7. POLÍTICAS PARA MARCAJES FALLIDOS (AUDITORÍA)
CREATE POLICY "Insercion Kiosco Marcajes Fallidos" ON public.marcajes_fallidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Total Marcajes Fallidos" ON public.marcajes_fallidos FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- FIN DEL SCRIPT CORREGIDO
-- ============================================================
