
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function measureGetServiceById(id) {
    const latencies = [];
    console.log(`\n--- Measuring getServiceById Composite (50 requests) ---`);
    for (let i = 0; i < 50; i++) {
        const start = Date.now();

        const [sRes, tasksRes, remindersRes, historyRes] = await Promise.all([
            supabase.from('serviços').select('*').eq('id', id).single(),
            supabase.from('tarefas').select('*').eq('service_id', id).order('order'),
            supabase.from('lembretes').select('*').eq('service_id', id),
            supabase.from('historico_status').select('*').eq('service_id', id).order('timestamp')
        ]);

        const elapsed = Date.now() - start;
        if (!sRes.error) latencies.push(elapsed);
        else console.warn(`Request ${i} failed:`, sRes.error.message);
    }

    if (latencies.length === 0) return;

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`getServiceById Composite Results:`);
    console.log(`  Requests: ${latencies.length}`);
    console.log(`  Avg: ${avg.toFixed(2)}ms`);
    console.log(`  p95: ${p95}ms`);
    console.log(`  p99: ${p99}ms`);
}

measureGetServiceById('00ba38e1-3f6c-4a5e-b480-44fc9a8825cf');
