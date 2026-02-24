
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function compare(iters = 5) {
    console.log(`--- Comparing V2 vs V3 (${iters} iterations) ---`);
    for (let i = 0; i < iters; i++) {
        const startV2 = Date.now();
        await supabase.rpc('get_dashboard_services', { p_limit: 50 });
        const endV2 = Date.now() - startV2;

        const startV3 = Date.now();
        await supabase.rpc('get_dashboard_services_v3', { p_limit: 50, p_org_id: 'org-default' });
        const endV3 = Date.now() - startV3;

        console.log(`Iter ${i}: V2=${endV2}ms | V3=${endV3}ms`);
    }
}

compare();
