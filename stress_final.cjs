
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dashParams = {
    p_limit: 50,
    p_offset: 0,
    p_statuses: null,
    p_client_id: null,
    p_vehicle_id: null,
    p_org_id: 'org-default'
};

const serviceId = '00ba38e1-3f6c-4a5e-b480-44fc9a8825cf';

async function runScenario(name, vus, durationMs, type, rpcName = 'get_dashboard_services_v3') {
    console.log(`\n🔥 SCENARIO: ${name} (${vus} VUs, ${durationMs / 1000}s)`);

    let totalReqs = 0;
    let errors = 0;
    const latencies = [];
    const startTime = Date.now();

    const workers = Array(vus).fill(null).map(async (_, idx) => {
        while (Date.now() - startTime < durationMs) {
            const start = Date.now();
            let res;

            if (type === 'write') {
                res = await supabase.from('serviços').update({ observation: 'Stress ' + Date.now() }).eq('id', serviceId);
            } else if (type === 'mixed') {
                if (idx % 2 === 0) {
                    res = await supabase.from('serviços').update({ observation: 'Stress ' + Date.now() }).eq('id', serviceId);
                } else {
                    res = await supabase.rpc(rpcName, dashParams);
                }
            } else {
                res = await supabase.rpc(rpcName, dashParams);
            }

            const elapsed = Date.now() - start;
            totalReqs++;
            if (res.error) errors++;
            else latencies.push(elapsed);
        }
    });

    await Promise.all(workers);
    const totalDuration = (Date.now() - startTime) / 1000;

    latencies.sort((a, b) => a - b);
    const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
    const rps = totalReqs / totalDuration;

    console.log(`   Results: RPS=${rps.toFixed(2)}, Avg=${avg.toFixed(2)}ms, p95=${p95}ms, Errors=${errors}/${totalReqs}`);
    return { name, rps, avg, p95, p99, errors, totalReqs };
}

async function startTests() {
    console.log('--- 🛡️ FINAL STRESS VALIDATION (20 VUs) ---');

    // 1. Dashboard v2 Baseline (Reads)
    const s2orig = await runScenario('Dash V2 Baseline (Reads)', 20, 10000, 'read', 'get_dashboard_services');

    // 2. Dashboard v3 Baseline (Reads)
    const s2perf = await runScenario('Dash V3 Optimized (Reads)', 20, 10000, 'read', 'get_dashboard_services_v3');

    // 3. 20 VUs Writes Only (Trigger Stress)
    const s1 = await runScenario('20 VUs Writes Only', 20, 10000, 'write');

    // 4. Mixed Load (10W / 10R)
    const s3 = await runScenario('Mixed Load (10W / 10R)', 20, 10000, 'mixed');

    console.log('\n--- COMPARATIVE REPORT ---');
    console.log(`DASH V2 p95: ${s2orig.p95}ms | RPS: ${s2orig.rps.toFixed(2)}`);
    console.log(`DASH V3 p95: ${s2perf.p95}ms | RPS: ${s2perf.rps.toFixed(2)} (Reflexo direto da tabela particionada)`);
    console.log(`\nContenção de Escritura (20 VUs): p95=${s1.p95}ms, FailRate=${(s1.errors / s1.totalReqs * 100).toFixed(2)}%`);
}

startTests();
