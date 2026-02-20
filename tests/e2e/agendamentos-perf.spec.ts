import { test, expect } from '@playwright/test';

/**
 * perf(agendamentos): Validação de performance do módulo de Agenda.
 *
 * Verifica:
 * 1. Carregamento da tela Agenda em <5s
 * 2. Nenhum sinal de loop infinito (render count < 10)
 * 3. Navegação de meses não causa jank
 * 4. Queries Supabase recebem limit (via response size)
 */

const FAKE_SESSION = JSON.stringify({
    id: 'test-perf-001',
    email: 'admin@garagem40.test',
    name: 'Admin Perf',
    role: 'admin',
    organization_id: 'org-default'
});

test.describe('perf(agendamentos): Performance do Agendamentos', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript((session) => {
            window.localStorage.setItem('g40_user_session', session);
        }, FAKE_SESSION);
    });

    test('PERF-001: Tela Agenda carrega em <5s', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const agendaBtn = page.locator('button', { hasText: 'Agenda' }).last();
        await expect(agendaBtn).toBeVisible({ timeout: 5000 });

        const start = Date.now();
        await agendaBtn.click();

        // Confirma que Agenda carregou
        const heading = page.locator('text=Agenda Oficina').or(page.locator('text=AGENDA OFICINA')).first();
        await expect(heading).toBeVisible({ timeout: 5000 });

        const elapsed = Date.now() - start;
        console.log(`[PERF-001] Agenda carregada em ${elapsed}ms`);
        expect(elapsed, `Agenda demorou ${elapsed}ms (>5000ms = falha)`).toBeLessThan(5000);
    });

    test('PERF-002: Sem loops — render count < 10 em 3s de observação', async ({ page }) => {
        let renderLogs = 0;

        page.on('console', (msg) => {
            if (msg.text().includes('[Agendamentos] initial-load')) {
                renderLogs++;
            }
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const agendaBtn = page.locator('button', { hasText: 'Agenda' }).last();
        if (await agendaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await agendaBtn.click();
            // Observa por 3 segundos se há loops
            await page.waitForTimeout(3000);
        }

        console.log(`[PERF-002] Renders observados: ${renderLogs}`);
        expect(renderLogs, `${renderLogs} renders detectados — possível loop!`).toBeLessThan(10);
    });

    test('PERF-003: Navegação de meses não causa jank', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const agendaBtn = page.locator('button', { hasText: 'Agenda' }).last();
        await expect(agendaBtn).toBeVisible({ timeout: 5000 });
        await agendaBtn.click();

        const heading = page.locator('text=Agenda Oficina').or(page.locator('text=AGENDA OFICINA')).first();
        await expect(heading).toBeVisible({ timeout: 5000 });

        // Clica 5x para frente e 5x para trás rapidamente
        const nextBtn = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).last();

        // Navega apertando ChevronRight 5x
        for (let i = 0; i < 5; i++) {
            const chevRight = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
            if (await chevRight.isVisible({ timeout: 1000 }).catch(() => false)) {
                await chevRight.click();
                await page.waitForTimeout(100);
            }
        }

        // Navega apertando ChevronLeft 5x
        for (let i = 0; i < 5; i++) {
            const chevLeft = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
            if (await chevLeft.isVisible({ timeout: 1000 }).catch(() => false)) {
                await chevLeft.click();
                await page.waitForTimeout(100);
            }
        }

        // App não deve ter crashado
        await expect(heading).toBeVisible({ timeout: 3000 });
        console.log('[PERF-003] ✅ Navegação de meses sem crash.');
    });

    test('PERF-004: Queries Supabase respeitam limit (max 200 registros)', async ({ page }) => {
        const responseSizes: { url: string; count: number }[] = [];

        await page.route('**/rest/v1/agendamentos*', async (route) => {
            const response = await route.fetch();
            const body = await response.json();
            responseSizes.push({ url: 'agendamentos', count: Array.isArray(body) ? body.length : -1 });
            console.log(`[PERF-004] agendamentos: ${responseSizes[responseSizes.length - 1].count} registros`);
            await route.fulfill({ response });
        });

        await page.route('**/rest/v1/lembretes*', async (route) => {
            const response = await route.fetch();
            const body = await response.json();
            responseSizes.push({ url: 'lembretes', count: Array.isArray(body) ? body.length : -1 });
            console.log(`[PERF-004] lembretes: ${responseSizes[responseSizes.length - 1].count} registros`);
            await route.fulfill({ response });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const agendaBtn = page.locator('button', { hasText: 'Agenda' }).last();
        if (await agendaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await agendaBtn.click();
            await page.waitForTimeout(3000);
        }

        console.log('[PERF-004] Response sizes:', JSON.stringify(responseSizes));

        for (const r of responseSizes) {
            if (r.count >= 0) {
                expect(r.count, `${r.url} retornou ${r.count} registros (>200 = sem limit)`).toBeLessThanOrEqual(200);
            }
        }

        console.log('[PERF-004] ✅ Todas as queries respeitam limit(200).');
    });
});
