
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testStatsDirect() {
    console.log('--- Direct Stats Table Performance Test ---');
    const latencies = [];
    for (let i = 0; i < 50; i++) {
        const start = Date.now();
        const { data, error } = await supabase.from('service_stats').select('*').eq('organization_id', 'org-default').single();
        const elapsed = Date.now() - start;
        if (!error) latencies.push(elapsed);
        else console.error('Error:', error.message);
    }

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    console.log(`Direct Read (service_stats): Avg=${avg.toFixed(2)}ms, p95=${latencies[Math.floor(latencies.length * 0.95)]}ms`);
}

testStatsDirect();
