const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.estaciones_kiosco (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      sede TEXT NOT NULL,
      estacion TEXT NOT NULL,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE public.estaciones_kiosco ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir lectura estaciones_kiosco" ON public.estaciones_kiosco;
    CREATE POLICY "Permitir lectura estaciones_kiosco" ON public.estaciones_kiosco FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Permitir insercion estaciones_kiosco" ON public.estaciones_kiosco;
    CREATE POLICY "Permitir insercion estaciones_kiosco" ON public.estaciones_kiosco FOR ALL USING (true);
  `;

  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  console.log('RPC execute_sql result:', { data, error });
}

main();
