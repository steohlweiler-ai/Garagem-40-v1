
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probe() {
    const orgId = 'org-default'; // Esta org tem 0 "Pronto"

    console.log(`\n--- Probando Org: ${orgId} sem filtro ---`);
    const { data: d1 } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 10,
        p_org_id: orgId
    });
    console.log(`Stats (Sem Filtro):`, JSON.stringify(d1[0].service_data.stats));

    console.log(`\n--- Probando Org: ${orgId} com filtro "Pronto" (que é 0) ---`);
    const { data: d2 } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 10,
        p_statuses: ['Pronto'],
        p_org_id: orgId
    });

    if (d2 && d2.length > 0) {
        console.log(`Stats (Filtro Pronto):`, JSON.stringify(d2[0].service_data.stats));
    } else {
        console.log('RPC retornou VAZIO (WIPE OUT)!');
    }
}

probe();
