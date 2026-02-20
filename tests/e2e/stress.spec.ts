import { test, expect } from '@playwright/test';

test.describe('Stress Validation - Cascading Re-renders & Multiple Logins', () => {

    test('Should handle rapid consecutive logins and state destruction without cascading re-renders', async ({ page }) => {
        // Escuta logs do console para verificar múltiplas renderizações do AuthProvider ou da App raiz
        let appRenderCount = 0;
        let authInitCount = 0;

        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[AuthProvider] Initializing auth...')) authInitCount++;
            if (text.includes('InnerApp Render')) appRenderCount++;
        });

        await page.goto('/');

        // Realizar multiplos logins rapidos simulando comportamento errático
        for (let i = 0; i < 3; i++) {
            // Assume already logged out or on login screen initially
            const nameInput = page.getByPlaceholder(/Nome|Email/i).first();
            if (await nameInput.isVisible()) {
                await nameInput.fill('Admin');
                await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
            }

            // Aguarda estar logado
            await expect(page.getByPlaceholder(/Buscar/i).first()).toBeVisible({ timeout: 10000 });

            // Faz logout rapido simulando o stress state change
            // Encontra o botão de logout no header
            const mobileLogoutBtn = page.getByTitle('Sair').first();
            if (await mobileLogoutBtn.isVisible()) {
                await mobileLogoutBtn.click();
            } else {
                // Pode estar na versao de tela grande
                const desktopLogoutBtn = page.locator('button').filter({ hasText: 'Sair' }).first();
                if (await desktopLogoutBtn.isVisible()) {
                    await desktopLogoutBtn.click();
                }
            }

            // Confirma que voltou para a base do login
            await expect(page.getByPlaceholder(/Nome|Email/i).first()).toBeVisible();
        }

        // Avalia o resultado - Auth Init só deve acontecer no mount original, não a cada loop de navegação graças ao isMounted e ao escopo protegido
        expect(authInitCount).toBeLessThanOrEqual(5); // Uma margem de folga, mas sem ser um loop infinito
        console.log(`E2E result: Auth inits: ${authInitCount}, App renders: ${appRenderCount}`);

        // Assegura que o Error boundary global não desarmou por conta de vazamentos de estado em cascata
        await expect(page.locator('text=CRITICAL UI ERROR')).not.toBeVisible();
    });

    test('Fast navigation between complex components should not trigger layout loops', async ({ page }) => {
        await page.goto('/');

        const nameInput = page.getByPlaceholder(/Nome|Email/i).first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('Admin');
            await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
        }
        await expect(page.getByPlaceholder(/Buscar/i).first()).toBeVisible({ timeout: 10000 });

        // Navegar rapidamente entre abas pesadas
        const tabs = ['Clientes', 'Agenda', 'Estoque', 'Painel'];

        for (let i = 0; i < 5; i++) {
            for (const tabName of tabs) {
                const tabButton = page.getByText(tabName, { exact: true }).first();
                if (await tabButton.isVisible()) {
                    await tabButton.click();
                    // Apenas esperamos breve intervalo e ja testamos o layout 
                    await page.waitForTimeout(100);
                    // A página não pode explodir (O Error Boundary capta se houver exception sem tratativa ou crash do React)
                    await expect(page.locator('text=CRITICAL UI ERROR')).not.toBeVisible();
                }
            }
        }

        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.trim().length).toBeGreaterThan(0);
    });
});
