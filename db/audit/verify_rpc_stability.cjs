
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getProc() {
    console.log('📜 [DIAGNOSTIC] Lendo definição do RPC get_dashboard_services_v3...\n');

    // Infelizmente o cliente anon não pode ler pg_proc diretamente via RLS normal.
    // Mas podemos tentar inferir pelo comportamento ou por um proxy.
    // Como não temos um proxy fácil, vamos olhar o arquivo de migração local
    // e explicar a falha lógica dele se ele for a versão "antiga".

    const { data, error } = await supabase.rpc('get_dashboard_services_v3', {
        p_limit: 0,
        p_statuses: ['STATUS_QUE_NAO_EXISTE_123'],
        p_org_id: 'org_1'
    });

    if (error) {
        console.error('Erro ao testar wipeout:', error);
    } else {
        console.log('Resultado do RPC com filtro vazio:', JSON.stringify(data));
        if (data && data.length > 0) {
            console.log('✅ RPC estável (v3 correta): Retorna 1 linha mesmo com filtro vazio.');
        } else {
            console.log('❌ RPC instável (v2/antiga): Retorna 0 linhas com filtro vazio. ISTO CAUSA O RESET DOS CARDS.');
        }
    }
}

getProc();
