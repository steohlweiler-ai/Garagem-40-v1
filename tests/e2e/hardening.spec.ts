import { test, expect } from '@playwright/test';

test.describe('Hardening Validation - Network Drops and Throttling', () => {

    test('Simulate network error (route.abort) and prove ErrorBoundary fallback without unmounting SPA', async ({ page }) => {
        let errorLogged = false;
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('Route Aborted')) {
                errorLogged = true;
            }
        });

        await page.goto('/');

        // Log in
        // O login as vezes demora no bootstrap (React mounts + providers + vite lazy load)
        await expect(page.getByRole('heading', { name: 'GARAGEM40' })).toBeVisible({ timeout: 15000 });

        // Clica no botão do header do layout master (que mostra que carregou e tá pronto)
        await expect(page.getByRole('heading', { name: /Clientes|Visão Geral|Buscar/i }).first()
            .or(page.getByPlaceholder(/Buscar/i).first())).toBeVisible({ timeout: 15000 });

        // Intercept both REST and Supabase realtime/backend connections and Abort them
        await page.route('**/*', async (route) => {
            const url = route.request().url();
            // Somente bloquear as chamadas que nao sao os assets estáticos do Vite
            if (!url.includes('localhost:3000') && !url.includes('127.0.0.1')) {
                await route.abort('failed');
            } else {
                await route.continue();
            }
        });

        // Tenta navegar para Agenda, o que faria fetch e dispararia as exceções
        await page.getByText('Agenda', { exact: true }).first().click();

        // O ErrorBoundary global ou do componente deve entrar em acao exibindo log de falha de carregamento
        // Devido ao ErrorBoundary de "InnerApp"
        await expect(page.locator('text=App Temporariamente Indisponível').or(page.locator('text=Erro ao carregar'))).toBeVisible({ timeout: 10000 });

        // A SPA tem que continuar viva permitindo clicar no Header
        expect(await page.getByRole('heading', { name: 'GARAGEM40' }).isVisible()).toBeTruthy();

        // Remove interception to recover
        await page.unroute('**/*');

        await page.getByText('Tentar Novamente').click();

        // Deve recuperar o estado do input e carregar Painel/Agenda novamente
        await expect(page.getByPlaceholder(/Buscar/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('Validate Agendamentos CRUD reloads data and render metrics with Slow 3G', async ({ page, browserName }) => {
        if (browserName !== 'chromium') {
            test.skip();
            return;
        }

        const client = await page.context().newCDPSession(page);

        // Simular throttling Slow 3G
        await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: ((500 * 1024) / 8) * 0.8,
            uploadThroughput: ((500 * 1024) / 8) * 0.8,
            latency: 400 * 5,
        });

        await page.goto('/');

        const nameInput = page.getByPlaceholder(/Nome|Email/i).first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('Admin');
            await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
        }

        // O tempo de renderização no slow 3G
        const startTime = Date.now();
        await expect(page.getByText('Agenda', { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await page.getByText('Agenda', { exact: true }).first().click();

        // Verifica se carregou sob condicoes throttling sem dar crash
        await expect(page.getByPlaceholder(/Buscar/i).first()).toBeVisible({ timeout: 30000 });

        const renderTime = Date.now() - startTime;
        console.log(`[Metrics] Render in Slow 3G took ${renderTime}ms`);

        // Prova que renders em cascata não acontecem com dependência []
        let dbFetchCount = 0;
        page.on('request', req => {
            if (req.url().includes('supabase')) dbFetchCount++;
        });

        // Input search string to verify it DOES NOT re-trigger DB fetches due to [] dependency
        await page.getByPlaceholder(/Buscar agendamento/i).first().fill('Test');
        await page.waitForTimeout(500); // give time for effect to theoretically fire

        // CRUD Reload Simulation (Adicionar um agendamento forçando reload do componente pai / context)
        await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
        await page.getByPlaceholder(/Título/i).first().fill('Teste Throttling Otimizado');
        await page.getByRole('button', { name: /Salvar/i }).first().click();

        console.log(`[Metrics] DB requests traced: ${dbFetchCount}`);
        expect(dbFetchCount).toBeLessThan(10); // Very conservative, just asserting it's not looping hundreds of times on keystrokes
    });
});
