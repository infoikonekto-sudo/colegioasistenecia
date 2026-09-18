-- ==========================================
-- PARCHE DE SEGURIDAD - COLEGIO ASISTENCIA
-- ==========================================
-- Este script activa Row Level Security (RLS) en todas las tablas sensibles
-- y configura las políticas exactas para que el Kiosco siga funcionando
-- sin exponer los datos a modificaciones maliciosas anónimas.

-- 1. REACTIVAR RLS EN TODAS LAS TABLAS CLAVE
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcajes_fallidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_descansos ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA LA TABLA 'empleados'
-- Permitir lectura (SELECT) a todos para que el kiosco pueda validar los QR y Cédulas.
CREATE POLICY "Permitir lectura publica empleados" ON public.empleados 
FOR SELECT USING (true);

-- Solo usuarios logueados en el panel (administradores) pueden crear, modificar o eliminar.
CREATE POLICY "Permitir todo a administradores en empleados" ON public.empleados 
FOR ALL USING (auth.role() = 'authenticated');

-- 3. POLÍTICAS PARA LA TABLA 'configuracion'
CREATE POLICY "Permitir lectura publica configuracion" ON public.configuracion 
FOR SELECT USING (true);

CREATE POLICY "Permitir todo a administradores en configuracion" ON public.configuracion 
FOR ALL USING (auth.role() = 'authenticated');

-- 4. POLÍTICAS PARA LA TABLA 'config_descansos'
CREATE POLICY "Permitir lectura publica descansos" ON public.config_descansos 
FOR SELECT USING (true);

CREATE POLICY "Permitir todo a administradores en descansos" ON public.config_descansos 
FOR ALL USING (auth.role() = 'authenticated');

-- 5. POLÍTICAS PARA LA TABLA 'marcajes'
-- El Kiosco necesita leer (SELECT) para calcular los 5 minutos de tiempo de espera (cooldown).
CREATE POLICY "Permitir lectura publica marcajes" ON public.marcajes 
FOR SELECT USING (true);

-- La API segura se encarga de las inserciones. Sin embargo, para evitar que el Kiosco se rompa
-- si no tienes SUPABASE_SERVICE_ROLE_KEY configurado, permitimos INSERT con rol anónimo.
-- NOTA: Como blindamos la API (route.ts), el atacante podría intentar insertar directamente.
-- Lo ideal es configurar SUPABASE_SERVICE_ROLE_KEY en tu hosting y cambiar esto a 'authenticated' o eliminar esta regla anon.
CREATE POLICY "Permitir insercion anonima marcajes" ON public.marcajes 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir todo a administradores en marcajes" ON public.marcajes 
FOR ALL USING (auth.role() = 'authenticated');

-- 6. POLÍTICAS PARA LA TABLA 'marcajes_fallidos'
-- Son logs de auditoría, permitimos que el Kiosco los inserte, pero nadie anónimo puede modificarlos ni borrarlos.
CREATE POLICY "Permitir insercion anonima marcajes fallidos" ON public.marcajes_fallidos 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura y todo a admin en marcajes fallidos" ON public.marcajes_fallidos 
FOR ALL USING (auth.role() = 'authenticated');


-- ==============================================================
-- INSTRUCCIONES:
-- Copia todo este código y ejecútalo en la sección "SQL Editor"
-- de tu panel de control de Supabase.
-- ==============================================================
