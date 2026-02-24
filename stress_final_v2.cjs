
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const baseParams = {
    p_limit: 50,
    p_offset: 0,
    p_statuses: null,
    p_client_id: null,
    p_vehicle_id: null
};

const v3Params = { ...baseParams, p_org_id: 'org-default' };

const serviceId = '00ba38e1-3f6c-4a5e-b480-44fc9a8825cf';

async function runScenario(name, vus, durationMs, type, rpcName = 'get_dashboard_services_v3') {
    console.log(`\n🔥 SCENARIO: ${name} (${vus} VUs, ${durationMs / 1000}s)`);

    let totalReqs = 0;
    let errors = 0;
    const latencies = [];
    const startTime = Date.now();

    const params = rpcName.includes('v3') ? v3Params : baseParams;

    const workers = Array(vus).fill(null).map(async (_, idx) => {
        while (Date.now() - startTime < durationMs) {
            const start = Date.now();
            let res;

            if (type === 'write') {
                // Update irrelevante para estressar trigger
                res = await supabase.from('serviços').update({ observation: 'Stress ' + Date.now() }).eq('id', serviceId);
            } else {
                res = await supabase.rpc(rpcName, params);
            }

            const elapsed = Date.now() - start;
            totalReqs++;
            if (res.error) {
                if (totalReqs < 5) console.error(`Error in ${rpcName}:`, res.error.message);
                errors++;
            } else {
                latencies.push(elapsed);
            }
        }
    });

    await Promise.all(workers);
    const totalDuration = (Date.now() - startTime) / 1000;

    latencies.sort((a, b) => a - b);
    const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const rps = totalReqs / totalDuration;

    console.log(`   Results: RPS=${rps.toFixed(2)}, Avg=${avg.toFixed(2)}ms, p95=${p95}ms, Errors=${errors}/${totalReqs}`);
    return { name, rps, avg, p95, errors, totalReqs };
}

async function startTests() {
    console.log('--- 🛡️ FINAL STRESS VALIDATION (20 VUs - CORRECTED) ---');

    // 1. Dashboard v2 Baseline
    await runScenario('Dash V2 (Reads)', 20, 10000, 'read', 'get_dashboard_services');

    // 2. Dashboard v3 Optimized
    await runScenario('Dash V3 (Reads)', 20, 10000, 'read', 'get_dashboard_services_v3');
}

startTests();
