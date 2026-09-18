const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zftywvfiusegrhvablnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdHl3dmZpdXNlZ3JodmFibG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTQyMTksImV4cCI6MjA4NTg5MDIxOX0.6XY8ipMK3p7koxde_DkMfTNvN9fVJVJLKoRuI17tbzk'
);

async function swapSedes() {
  console.log('Fetching empleados...');
  const { data: empleados, error } = await supabase.from('empleados').select('id, sede');
  
  if (error) {
    console.error('Error fetching empleados:', error);
    return;
  }

  let swapped = 0;
  for (const emp of empleados) {
    if (emp.sede === 'CAES' || emp.sede === 'ROOS') {
      const newSede = emp.sede === 'CAES' ? 'ROOS' : 'CAES';
      await supabase.from('empleados').update({ sede: newSede }).eq('id', emp.id);
      swapped++;
    }
  }
  
  console.log(`Successfully swapped sede for ${swapped} empleados.`);
}

swapSedes();
