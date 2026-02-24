
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrgs() {
    console.log('📊 [DIAGNOSTIC] Contagem de registros por Organization ID:\n');

    // 1. Contagem agrupada por organization_id
    const { data: services, error } = await supabase
        .from('serviços')
        .select('organization_id');

    if (error) {
        console.error('Erro ao buscar serviços:', error);
        return;
    }

    const counts = services.reduce((acc, curr) => {
        const id = curr.organization_id || 'NULL';
        acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});

    console.log('Serviços por Org:');
    console.table(counts);

    // 2. Verificar perfis de usuário para ver qual org_id eles usam
    console.log('\n👤 [DIAGNOSTIC] Amostra de Perfis de Usuário:');
    const { data: profiles, error: profErr } = await supabase
        .from('perfis_de_usuário')
        .select('id, organization_id, name')
        .limit(10);

    if (profErr) console.error('Erro ao buscar perfis:', profErr);
    else console.table(profiles);

    // 3. Verificar o usuário logado (pelo menos um deles)
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    // Nota: admin.listUsers() pode falhar com anon key, vamos tentar simular o que o Frontend faz.
}

checkOrgs();
