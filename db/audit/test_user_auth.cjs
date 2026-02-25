const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

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
    
    if(!profile) {
       console.log("No profile found");
    } else {
       console.log('User Profile:', JSON.stringify(profile, null, 2));
    }

    const orgId = profile?.organization_id || 'org_1';
    console.log('Using Org ID for RPC:', orgId);

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
}
main();
