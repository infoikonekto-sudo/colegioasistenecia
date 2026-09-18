const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno para Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrarQRsRetroactivos() {
  console.log('--- MIGRACIÓN RETROACTIVA DE CÓDIGOS QR PARA EMPLEADOS ---');

  const { data: empleados, error } = await supabase
    .from('empleados')
    .select('id, nombre, apellido, cedula, qr_code')
    .eq('activo', true);

  if (error) {
    console.error('Error al consultar empleados:', error);
    process.exit(1);
  }

  console.log(`Total empleados activos encontrados: ${empleados.length}`);

  let actualizados = 0;
  for (const emp of empleados) {
    if (!emp.qr_code) {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const qrCode = `EMPL-${randomHex}`;

      const { error: updateError } = await supabase
        .from('empleados')
        .update({
          qr_code: qrCode,
          qr_generado_at: new Date().toISOString()
        })
        .eq('id', emp.id);

      if (updateError) {
        console.error(`Error actualizando QR para ${emp.nombre} ${emp.apellido}:`, updateError);
      } else {
        actualizados++;
        console.log(`✅ [${actualizados}] Asignado QR ${qrCode} a ${emp.nombre} ${emp.apellido}`);
      }
    }
  }

  console.log(`\n🎉 Proceso finalizado. Total de nuevos QRs asignados: ${actualizados}`);
}

migrarQRsRetroactivos();
