
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log('🔍 [DIAGNOSTIC] Iniciando verificação de banco de dados...');
    const orgId = 'org_1';

    // 1. Contagem direta na tabela
    console.log(`\n--- [1] Contagem Direta (Tabela "serviços") ---`);
    const { data: rawData, count, error: countErr } = await supabase
        .from('serviços')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

    if (countErr) console.error('Erro na contagem direta:', countErr);
    else console.log(`Total para ${orgId}: ${count}`);

    // 2. Chamada RPC get_dashboard_services_v3
    console.log(`\n--- [2] Chamada RPC get_dashboard_services_v3 ---`);
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 100,
        p_offset: 0,
        p_statuses: null,
        p_org_id: orgId
    });

    if (rpcErr) console.error('Erro no RPC:', rpcErr);
    else {
        if (rpcData && rpcData.length > 0) {
            const { service_data, total_count } = rpcData[0];
            console.log(`Total count retornado pelo RPC: ${total_count}`);
            console.log(`Services array length: ${service_data.services.length}`);
            console.log(`Stats retornados:`, JSON.stringify(service_data.stats, null, 2));
        } else {
            console.log('RPC retornou array vazio.');
        }
    }

    // 3. Verificação de interferência de filtros nos Stats
    console.log(`\n--- [3] Verificação de Interferência de Filtros ---`);
    const { data: rpcFilteredData, error: rpcFilteredErr } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 100,
        p_offset: 0,
        p_statuses: ['Pendente'],
        p_org_id: orgId
    });

    if (rpcFilteredErr) console.error('Erro no RPC filtrado:', rpcFilteredErr);
    else if (rpcFilteredData && rpcFilteredData.length > 0) {
        const { service_data } = rpcFilteredData[0];
        console.log(`Stats ao filtrar por "Pendente":`, JSON.stringify(service_data.stats, null, 2));
    }

    // 4. Checar a tabela service_stats diretamente
    console.log(`\n--- [4] Tabela service_stats ---`);
    const { data: statsRow, error: statsRowErr } = await supabase
        .from('service_stats')
        .select('*')
        .eq('organization_id', orgId);

    if (statsRowErr) console.error('Erro ao ler service_stats:', statsRowErr);
    else console.log(`Linha em service_stats para ${orgId}:`, JSON.stringify(statsRow, null, 2));

}

diagnose();
