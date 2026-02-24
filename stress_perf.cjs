
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function measureLatency(name, rpcName, params = {}) {
    const latencies = [];
    console.log(`\n--- Measuring ${name} (50 requests) ---`);
    for (let i = 0; i < 50; i++) {
        const start = Date.now();
        const { error } = await supabase.rpc(rpcName, params);
        const elapsed = Date.now() - start;
        if (!error) latencies.push(elapsed);
        else console.warn(`Request ${i} failed:`, error.message);
    }

    if (latencies.length === 0) return;

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`${name} Results:`);
    console.log(`  Requests: ${latencies.length}`);
    console.log(`  Avg: ${avg.toFixed(2)}ms`);
    console.log(`  p95: ${p95}ms`);
    console.log(`  p99: ${p99}ms`);
}

async function runConcurrentTest(name, rpcName, params = {}, vus = 20, durationMs = 10000) {
    console.log(`\n--- Concurrent Test ${name} (${vus} VUs, ${durationMs / 1000}s) ---`);
    let totalReqs = 0;
    let errors = 0;
    const allLatencies = [];
    const startTime = Date.now();

    const workers = Array(vus).fill(null).map(async () => {
        while (Date.now() - startTime < durationMs) {
            const start = Date.now();
            const { error } = await supabase.rpc(rpcName, params);
            const elapsed = Date.now() - start;
            totalReqs++;
            if (error) errors++;
            else allLatencies.push(elapsed);
        }
    });

    await Promise.all(workers);
    const totalDuration = (Date.now() - startTime) / 1000;

    allLatencies.sort((a, b) => a - b);
    const avg = allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b) / allLatencies.length : 0;
    const p95 = allLatencies.length > 0 ? allLatencies[Math.floor(allLatencies.length * 0.95)] : 0;
    const rps = totalReqs / totalDuration;

    console.log(`${name} Concurrency Results:`);
    console.log(`  RPS: ${rps.toFixed(2)}`);
    console.log(`  Avg Latency: ${avg.toFixed(2)}ms`);
    console.log(`  p95: ${p95}ms`);
    console.log(`  Error Rate: ${((errors / totalReqs) * 100).toFixed(2)}%`);
}

async function runAll() {
    const dashParams = {
        p_limit: 50,
        p_offset: 0,
        p_statuses: null,
        p_client_id: null,
        p_vehicle_id: null,
        p_org_id: 'org-default'
    };
    const serviceId = '00ba38e1-3f6c-4a5e-b480-44fc9a8825cf';
    const taskId = '158dd313-5d0d-4cb8-a3c2-83971b666ec7';

    console.log('\n🚀 --- RUNNING OPTIMIZED PERFORMANCE TEST --- 🚀');

    await measureLatency('Dashboard v3 (Counter Table)', 'get_dashboard_services_v3', dashParams);

    await measureLatency('Unified Service Detail (1 RPC)', 'get_service_detail_unified', { p_id: serviceId });

    await measureLatency('Start Task Atomic', 'start_task_atomic', {
        p_task_id: taskId,
        p_user_id: 'perf-test',
        p_user_name: 'Perf Tester'
    });

    // Concurrent test (reduced duration)
    await runConcurrentTest('Dashboard v3', 'get_dashboard_services_v3', dashParams, 10, 5000);
}

runAll();
