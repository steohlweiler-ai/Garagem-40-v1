const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envStr = '';
try { envStr = fs.readFileSync('.env.development', 'utf-8'); } catch(e) {}
if (!envStr) {
  try { envStr = fs.readFileSync('.env', 'utf-8'); } catch(e) {}
}

const SUPABASE_URL = envStr.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_ANON_KEY = envStr.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];
const SERVICE_KEY = envStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || SUPABASE_ANON_KEY;

if(!SUPABASE_URL) {
  console.log("Could not find SUPABASE_URL");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    console.log('Querying perfis_de_usuário for garagem40.nene@gmail.com...');
    
    // Auth users can't be queried directly with anon key without login, but we can query perfis_de_usuario
    const { data: profiles, error } = await supabase
        .from('perfis_de_usuário')
        .select('*');
        
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    
    console.log(`Found ${profiles?.length || 0} profiles`);
    if(profiles) {
      console.log(profiles);
    }
}
main();
