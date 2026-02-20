import { test, expect } from '@playwright/test';

/**
 * ═══════════════════════════════════════════════════════════════
 *  CERTIFICAÇÃO CERT-001: ABORT REAL DE REDE VIA AbortController
 * ═══════════════════════════════════════════════════════════════
 *
 * OBJETIVO: Provar que `abortController.abort()` cancela requests
 * reais de rede (fetch) para o Supabase, resultando em net::ERR_ABORTED.
 *
 * URL REAL DO SUPABASE:
 *   https://jzprxydtigwitltaagnd.supabase.co/rest/v1/agendamentos
 *   https://jzprxydtigwitltaagnd.supabase.co/rest/v1/lembretes
 *
 * FLUXO DO TESTE:
 *   1. Injeta sessão → app carrega logado no Dashboard
 *   2. Navega para Agenda (primeiro clique, sem interceptar)
 *   3. Volta ao Painel
 *   4. AGORA intercepta as rotas REST → requests ficam pendentes
 *   5. Volta para Agenda → requests são enviadas mas não respondidas
 *   6. Navega para fora (Painel) → componente desmonta → abort()
 *   7. Captura request.failure().errorText === net::ERR_ABORTED
 */

// Sessão válida para o AuthProvider (requer id + email)
const FAKE_SESSION = JSON.stringify({
    id: 'test-e2e-cert-001',
    email: 'admin@garagem40.test',
    name: 'Admin E2E',
    role: 'admin',
    organization_id: 'org-default'
});

test.describe('CERT-001: Abort Real de Rede', () => {

    test('AbortController.abort() cancela request Supabase com net::ERR_ABORTED', async ({ page }) => {

        // ──── Coletores de evidência ────
        const evidence = {
            sent: [] as string[],
            aborted: [] as { url: string; errorText: string }[],
            intercepted: 0,
        };

        page.on('request', (req) => {
            const url = req.url();
            if (url.includes('/rest/v1/agendamentos') || url.includes('/rest/v1/lembretes')) {
                evidence.sent.push(url.split('?')[0]);
            }
        });

        page.on('requestfailed', (req) => {
            const url = req.url();
            const errorText = req.failure()?.errorText ?? 'unknown';
            if (url.includes('/rest/v1/agendamentos') || url.includes('/rest/v1/lembretes')) {
                evidence.aborted.push({ url: url.split('?')[0], errorText });
            }
        });

        // ──── PASSO 1: Injeta sessão e carrega app ────
        await page.addInitScript((session) => {
            window.localStorage.setItem('g40_user_session', session);
        }, FAKE_SESSION);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Dois botões "Agenda" existem no DOM: Sidebar (hidden lg:flex) e MobileNav (lg:hidden)
        // Usamos last() para pegar o da MobileNavigation (bottom nav, sempre visível)
        const agendaBtn = page.locator('button', { hasText: 'Agenda' }).last();
        const painelBtn = page.locator('button', { hasText: 'Painel' }).last();

        // ──── PASSO 2: Primeiro clique em Agenda (sem interceptar) ────
        await expect(agendaBtn).toBeVisible({ timeout: 10000 });
        await agendaBtn.click();
        console.log('[CERT-001] Clicou em Agenda (primeiro clique).');

        // ──── PASSO 3: Confirma tela Agenda ────
        const agendaHeading = page.locator('text=Agenda Oficina')
            .or(page.locator('text=AGENDA OFICINA'));
        await expect(agendaHeading.first()).toBeVisible({ timeout: 8000 });
        console.log('[CERT-001] ✅ Tela AGENDA OFICINA confirmada visível.');

        // ──── PASSO 4: Volta ao Painel ────
        await painelBtn.click();
        await page.waitForTimeout(500);
        console.log('[CERT-001] Voltou ao Painel.');

        // ──── PASSO 5: Intercepta rotas REST (requests ficam pendentes) ────
        await page.route('**/rest/v1/agendamentos*', async () => {
            evidence.intercepted++;
            console.log(`[CERT-001] 🔴 agendamentos interceptada (#${evidence.intercepted}) — NÃO respondendo`);
            // Propositalmente NÃO chama route.fulfill() nem route.continue()
            // A request fica pendurada até AbortController.abort() matá-la
        });
        await page.route('**/rest/v1/lembretes*', async () => {
            evidence.intercepted++;
            console.log(`[CERT-001] 🔴 lembretes interceptada (#${evidence.intercepted}) — NÃO respondendo`);
        });
        console.log('[CERT-001] Interceptações configuradas.');

        // ──── PASSO 6: Volta para Agenda (requests serão enviadas e travadas) ────
        await agendaBtn.click();
        console.log('[CERT-001] Clicou em Agenda (segundo clique, com interceptações).');

        // Aguarda requests serem disparadas e ficarem presas
        await page.waitForTimeout(2500);

        console.log(`[CERT-001] Requests enviadas: ${evidence.sent.length}`);
        console.log(`[CERT-001] Requests interceptadas: ${evidence.intercepted}`);
        evidence.sent.forEach(u => console.log(`  → SENT: ${u}`));

        // Valida que pelo menos 1 request foi interceptada
        expect(evidence.intercepted,
            'Nenhuma request chegou ao interceptor — app pode estar em modo mock.'
        ).toBeGreaterThan(0);

        // ──── PASSO 7: Desmonta Agendamentos → dispara abortController.abort() ────
        console.log('[CERT-001] Navegando para fora — desmontando componente...');
        await painelBtn.click();

        // Aguarda propagação do abort no layer de rede
        await page.waitForTimeout(2500);

        // ══════════════════════════════════════════════
        //  RESULTADO DA CERTIFICAÇÃO
        // ══════════════════════════════════════════════
        console.log('');
        console.log('══════════════════════════════════════════════════════════');
        console.log('  CERT-001: RESULTADO DA CERTIFICAÇÃO DE ABORT REAL');
        console.log('══════════════════════════════════════════════════════════');
        console.log(`  Requests enviadas ao Supabase:   ${evidence.sent.length}`);
        evidence.sent.forEach(u => console.log(`    → SENT:     ${u}`));
        console.log(`  Requests interceptadas (pendentes): ${evidence.intercepted}`);
        console.log(`  Requests abortadas (ERR_ABORTED):   ${evidence.aborted.length}`);
        evidence.aborted.forEach(r => {
            console.log(`    → ABORTED:  ${r.url}`);
            console.log(`      errorText: "${r.errorText}"`);
        });
        console.log('══════════════════════════════════════════════════════════');

        // ──── ASSERÇÃO PRINCIPAL ────
        expect(evidence.aborted.length,
            `FALHA: ${evidence.intercepted} requests interceptadas, mas ` +
            `${evidence.aborted.length} abortadas. O AbortController NÃO cancela requests reais!`
        ).toBeGreaterThan(0);

        // ──── VALIDAÇÃO DO ERRO ────
        const first = evidence.aborted[0];
        console.log(`\n[CERT-001] ✅ CERTIFICAÇÃO APROVADA`);
        console.log(`  URL:       ${first.url}`);
        console.log(`  errorText: "${first.errorText}"`);

        // O errorText deve conter "abort" (Chromium: "net::ERR_ABORTED")
        expect(first.errorText.toLowerCase(),
            `errorText "${first.errorText}" não contém "abort"`
        ).toContain('abort');
    });
});
