const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fix() {
  const { data, error } = await supabase.from('admin_profiles').select('*');
  console.log('Profiles:', data);
  if (data) {
    for (const p of data) {
      if (p.email === 'admincaes@gmail.com' && p.sede !== 'CAES') {
        console.log('Fixing admincaes to CAES...');
        await supabase.from('admin_profiles').update({ sede: 'CAES' }).eq('email', 'admincaes@gmail.com');
      }
      if (p.email === 'adminroos@gmail.com' && p.sede !== 'ROOS') {
        console.log('Fixing adminroos to ROOS...');
        await supabase.from('admin_profiles').update({ sede: 'ROOS' }).eq('email', 'adminroos@gmail.com');
      }
    }
  }
}
fix();
