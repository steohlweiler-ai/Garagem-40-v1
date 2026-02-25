const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let envStr = '';
try { envStr = fs.readFileSync('.env', 'utf-8'); } catch(e) {}
if (!envStr) {
  try { envStr = fs.readFileSync('.env.development', 'utf-8'); } catch(e) {}
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envStr.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || envStr.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log('Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'garagem40.nene@gmail.com',
        password: 'G@r@gem40!'
    });
    if (authError) return console.error('Login failed:', authError.message);
    const userId = authData.user.id;
    console.log('Logged in as:', userId);

    const { data: profile } = await supabase.from('perfis_de_usuário').select('*').eq('user_id', userId).single();
    const orgId = profile?.organization_id || 'org_1';
    console.log('User Profile Org ID:', orgId);

    console.log('\n--- Calling get_dashboard_services_v3 ---');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 50,
        p_offset: 0,
        p_statuses: null,
        p_client_id: null,
        p_vehicle_id: null,
        p_org_id: orgId
    });

    if (rpcError) console.error('RPC Error:', rpcError);
    else {
        if (rpcData && rpcData.length > 0) {
            console.log('RPC Total Count:', rpcData[0].total_count);
            console.log('RPC Stats:', JSON.stringify(rpcData[0].service_data.stats));
            console.log('RPC Returned Array Length:', rpcData[0].service_data.services?.length);
        } else console.log('RPC Returned empty array');
    }

    console.log('\n--- Calling Classic Query ---');
    const { data: classicData, error: classicError, count } = await supabase.from('serviços').select('*', { count: 'exact' });
    if (classicError) console.error('Classic Error:', classicError);
    else {
        console.log('Classic Count:', count);
        console.log('Classic Length:', classicData.length);
    }
}
main();
