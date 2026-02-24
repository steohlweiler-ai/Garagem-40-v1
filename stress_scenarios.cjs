
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

const taskId = '158dd313-5d0d-4cb8-a3c2-83971b666ec7';

async function runScenario(name, vus, durationMs, writeRatio = 0) {
    console.log(`\n🔥 SCENARIO: ${name} (${vus} VUs, ${durationMs / 1000}s, WriteRatio: ${writeRatio})`);

    let totalReqs = 0;
    let errors = 0;
    const latencies = [];
    const startTime = Date.now();

    const workers = Array(vus).fill(null).map(async (_, idx) => {
        while (Date.now() - startTime < durationMs) {
            const isWrite = (idx < vus * writeRatio);
            const start = Date.now();

            let res;
            if (isWrite) {
                // Scenario 1/3: Atomic Write
                res = await supabase.rpc('start_task_atomic', {
                    p_task_id: taskId,
                    p_user_id: `vu-${idx}`,
                    p_user_name: `VU Worker ${idx}`
                });
            } else {
                // Scenario 2/3: Dashboard Read
                res = await supabase.rpc('get_dashboard_services_v3', dashParams);
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

    console.log(`   Results:`);
    console.log(`     RPS: ${rps.toFixed(2)}`);
    console.log(`     Latency Avg: ${avg.toFixed(2)}ms`);
    console.log(`     p95: ${p95}ms`);
    console.log(`     p99: ${p99}ms`);
    console.log(`     Error Rate: ${((errors / totalReqs) * 100).toFixed(2)}% (${errors}/${totalReqs})`);

    return { name, rps, avg, p95, p99, errors, totalReqs };
}

async function startTests() {
    console.log('--- STARTING MULTI-SCENARIO STRESS TEST ---');

    // Scenario 1: 20 VUs Write only
    const s1 = await runScenario('20 VUs Write Only', 20, 10000, 1.0);

    // Scenario 2: 20 VUs Read only
    const s2 = await runScenario('20 VUs Read Only', 20, 10000, 0.0);

    // Scenario 3: Mixed (10 Read / 10 Write)
    const s3 = await runScenario('Mixed Load (10W / 10R)', 20, 10000, 0.5);

    console.log('\n--- FINAL SUMMARY ---');
    [s1, s2, s3].forEach(s => {
        console.log(`${s.name}: RPS=${s.rps.toFixed(2)}, p95=${s.p95}ms, Errors=${s.errors}`);
    });
}

startTests();
