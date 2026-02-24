
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function validate() {
    console.log('🔍 INICIANDO VALIDAÇÃO DA MIGRAÇÃO 012...\n');

    const serviceId = '00ba38e1-3f6c-4a5e-b480-44fc9a8825cf';
    const orgId = 'org-default';

    // 1. Verificar service_stats
    console.log('[1/5] Verificando tabela service_stats...');
    const { data: stats, error: statsErr } = await supabase.from('service_stats').select('*').eq('organization_id', orgId);
    if (statsErr) console.error('  ❌ Erro ao ler service_stats:', statsErr.message);
    else if (stats && stats.length > 0) {
        console.log('  ✅ service_stats encontrada e populada:', JSON.stringify(stats[0]));
    }

    // 2. Comparar Dashboard v2 vs v3
    console.log('\n[2/5] Comparando Dashboard v2 vs v3 (Baseline)...');
    const startV2 = Date.now();
    const { data: v2Data } = await supabase.rpc('get_dashboard_services', { p_limit: 50 });
    const endV2 = Date.now() - startV2;
    console.log(`  📊 Dashboard v2: ${endV2}ms`);

    const startV3 = Date.now();
    const { data: v3Data } = await supabase.rpc('get_dashboard_services_v3', { p_limit: 50, p_org_id: orgId });
    const endV3 = Date.now() - startV3;
    console.log(`  🚀 Dashboard v3: ${v3Data ? endV3 + 'ms' : 'FAIL'} (Ganho esperado: ~80%)`);

    // 3. Verificar RPC Unificada
    console.log('\n[3/5] Verificando RPC get_service_detail_unified...');
    const { data: detail, error: detailErr } = await supabase.rpc('get_service_detail_unified', { p_id: serviceId });
    if (detailErr) console.error('  ❌ Erro na RPC Unificada:', detailErr.message);
    else if (detail && detail.service) {
        console.log(`  ✅ RPC Unificada OK. Histórico: ${detail.history.length} registros.`);
    }

    // 4. Validar Cenários de Trigger
    console.log('\n[4/5] Validando Cenários de Trigger...');

    // Pegar stats atual
    const { data: sInit } = await supabase.from('service_stats').select('updated_at').eq('organization_id', orgId).single();
    if (!sInit) {
        console.error('  ❌ Nao foi possível ler service_stats para o teste de trigger.');
    } else {
        const lastUpdate = sInit.updated_at;

        // A. Update irrelevante (ex: observação)
        console.log('  A. Update irrelevante (observation)...');
        await supabase.from('serviços').update({ observation: 'Trigger Test ' + Date.now() }).eq('id', serviceId);
        await new Promise(r => setTimeout(r, 1000));
        const { data: sA } = await supabase.from('service_stats').select('updated_at').eq('organization_id', orgId).single();
        if (sA.updated_at === lastUpdate) console.log('     ✅ Correto: updated_at não mudou.');
        else console.warn('     ⚠️ Trigger disparou desnecessariamente.');

        // B. Update de Status (relevante)
        console.log('  B. Update de Status (Pendente -> Em Andamento)...');
        await supabase.from('serviços').update({ status: 'Em Andamento' }).eq('id', serviceId);
        await new Promise(r => setTimeout(r, 1000));
        const { data: sB } = await supabase.from('service_stats').select('updated_at').eq('organization_id', orgId).single();
        if (sB.updated_at !== lastUpdate) console.log('     ✅ Correto: updated_at atualizado.');
        else console.error('     ❌ Trigger não disparou para mudança de status.');

        // C. Update repetido (sem mudança real)
        const midUpdate = sB.updated_at;
        console.log('  C. Update repetido (mesmo status)...');
        await supabase.from('serviços').update({ status: 'Em Andamento' }).eq('id', serviceId);
        await new Promise(r => setTimeout(r, 1000));
        const { data: sC } = await supabase.from('service_stats').select('updated_at').eq('organization_id', orgId).single();
        if (sC.updated_at === midUpdate) console.log('     ✅ Correto: updated_at não mudou.');
        else console.warn('     ⚠️ Trigger disparou para update repetido.');

        // Reverter
        await supabase.from('serviços').update({ status: 'Pendente' }).eq('id', serviceId);
        console.log('  ✅ Status revertido.');
    }

    console.log('\n🏁 VALIDAÇÃO CONCLUÍDA.');
}

validate();
