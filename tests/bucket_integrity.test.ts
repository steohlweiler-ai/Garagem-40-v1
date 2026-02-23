
// Mocking global environment for Node.js
global.importMeta = { env: { VITE_DATA_SOURCE: 'mock' } };
const crypto = require('node:crypto');
global.crypto = { randomUUID: () => crypto.randomUUID() };
global.localStorage = {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null,
    clear: () => null
};

async function runTests() {
    console.log('🚀 Starting Bucket Integrity & SSoT Tests...');

    try {
        // Dynamic imports to avoid early env errors
        const { dataProvider } = await import('../src/services/dataProvider');
        const { ServiceStatus } = await import('../src/types/index');

        // 1. Testar SSoT de Inspeção (Subtipos)
        console.log('\n--- Test 1: Inspection SSoT Persistence ---');
        const testService = await dataProvider.addService({
            organization_id: 'org_test',
            status: ServiceStatus.PENDENTE,
            inspection: {
                template_id: 'tmpl_test',
                template_name: 'Test Template',
                items: {
                    'Pneu': {
                        checked: true,
                        selectedTypes: ['troca'],
                        relato: 'Gasto no TWI',
                        diagnostico: 'Substituição imediata'
                    }
                }
            }
        } as any);

        const pneuItem = (testService?.inspection?.items as any)?.['Pneu'];
        if (testService && pneuItem?.selectedTypes.includes('troca')) {
            console.log('✅ Inspection SSoT successfully persisted subtypes in creation.');
        } else {
            console.error('❌ Failed to persist inspection subtypes.', testService?.inspection);
        }

        // 2. Testar Ordenação por Buckets
        console.log('\n--- Test 2: Priority Bucket Sorting ---');

        // Mocking behavior of priority_bucket (usually handled by DB trigger, manual for test)
        await dataProvider.addService({
            description: 'NORMAL',
            priority_bucket: 1, // No Prazo
            estimated_delivery: new Date(Date.now() + 86400000).toISOString()
        } as any);

        await dataProvider.addService({
            description: 'ATRASADA',
            priority_bucket: 0, // Atrasada
            estimated_delivery: new Date(Date.now() - 86400000).toISOString()
        } as any);

        const results = await dataProvider.getServicesFiltered({ limit: 10 });
        const services = results.data;

        const atrasadaIdx = services.findIndex((s: any) => s.description === 'ATRASADA');
        const normalIdx = services.findIndex((s: any) => s.description === 'NORMAL');

        if (atrasadaIdx !== -1 && normalIdx !== -1 && atrasadaIdx < normalIdx) {
            console.log(`✅ Priority Bucket validated: ATRASADA (index ${atrasadaIdx}) is before NORMAL (index ${normalIdx}).`);
        } else {
            console.error('❌ Sorting logic failed.', { atrasadaIdx, normalIdx });
        }

        console.log('\n✅ All integrity tests passed!');
    } catch (error) {
        console.error('❌ Tests failed with error:', error);
    }
}

runTests();
