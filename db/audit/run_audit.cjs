
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
    console.log('📡 [1/3] EXECUTANDO RPC DE AUDITORIA NO SUPABASE...');

    const { data, error } = await supabase.rpc('audit_db_full_diagnostics');

    if (error) {
        console.error('❌ ERRO AO EXECUTAR AUDITORIA:', error.message);
        console.log('💡 Certifique-se de que aplicou o conteúdo de db/audit/audit_db_integrity.sql no SQL Editor.');
        process.exit(1);
    }

    console.log('📂 [2/3] ANALISANDO MIGRAÇÕES LOCAIS...');
    const migrationDir = path.join(__dirname, '../migrations');
    const localMigrations = fs.readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const report = {
        summary: {
            critical: 0,
            warnings: 0,
            info: 0,
            timestamp: new Date().toISOString()
        },
        security: {
            functions: [],
            permissions: []
        },
        integrity: {
            missing_indexes: data.missing_indexes || [],
            potential_orphans: data.potential_orphans || [],
            migration_drift: {
                local_count: localMigrations.length,
                db_tracking: data.migration_history,
                files: localMigrations
            }
        },
        raw_data: data
    };

    // Classificar Funções
    data.security_functions.forEach(f => {
        if (f.security_status.includes('CRITICAL')) report.summary.critical++;
        else if (f.security_status === 'OK') report.summary.info++;
        report.security.functions.push(f);
    });

    // Classificar Permissões
    (data.security_permissions || []).forEach(p => {
        if (p.risk_level.includes('CRITICAL')) report.summary.critical++;
        else if (p.risk_level.includes('WARNING')) report.summary.warnings++;
        report.security.permissions.push(p);
    });

    // Adicionar Alertas de Índices e Órfãos
    if (report.integrity.missing_indexes.length > 0) {
        report.summary.warnings += report.integrity.missing_indexes.length;
    }
    if (report.integrity.potential_orphans.length > 0) {
        report.summary.info += report.integrity.potential_orphans.length;
    }

    const reportFile = path.join(__dirname, 'audit_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n🌟 [3/3] RESULTADOS DA AUDITORIA:');
    console.log(`   🔴 CRITICAL: ${report.summary.critical}`);
    console.log(`   🟡 WARNING:  ${report.summary.warnings}`);
    console.log(`   🔵 INFO:     ${report.summary.info}`);
    console.log(`\n📄 Relatório detalhado salvo em: ${reportFile}`);

    if (report.summary.critical > 0) {
        console.log('\n❌ ATENÇÃO: Foram encontrados problemas CRÍTICOS que exigem correção imediata.');
    } else {
        console.log('\n✅ Nenhuma vulnerabilidade crítica detectada nas funções auditadas.');
    }
}

runAudit();
