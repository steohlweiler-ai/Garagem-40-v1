
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probe() {
    const orgs = ['org_1', 'org-default', 'org-test', 'org_2'];

    for (const org of orgs) {
        console.log(`\n--- Probando Org: ${org} ---`);
        const { data, error } = await supabase.rpc('get_dashboard_services_v3', {
            p_limit: 100,
            p_org_id: org
        });

        if (error) {
            console.error(`  Error: ${error.message}`);
        } else if (data && data.length > 0) {
            const { service_data, total_count } = data[0];
            console.log(`  Total Count: ${total_count}`);
            console.log(`  Stats:`, JSON.stringify(service_data.stats));
        } else {
            console.log('  Sin resultados.');
        }
    }
}

probe();
