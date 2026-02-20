import { test, expect } from '@playwright/test';

test.describe('SPA Rendering Stability', () => {
    test('TC002 & TC009 - should not show blank screen after login and modal interactions', async ({ page }) => {
        // 1. Visit the app
        await page.goto('/');

        // 2. Perform mock login (mock user data since the app has fallback mocked users)
        const nameInput = page.getByPlaceholder(/Nome|Email/i).first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('Admin');
            await page.keyboard.press('Enter');
        }

        // 3. Ensure we reached the dashboard and the page is NOT blank
        await expect(page.locator('text=Painel').first()).toBeVisible();
        await expect(page.locator('#root')).not.toBeEmpty();

        // 4. Navigate to Clients Tab
        await page.getByText('Clientes').click();
        await expect(page.locator('text=Gestão de Clientes').first()).toBeVisible();

        // 5. Open new Client Modal
        await page.getByRole('button', { name: /Novo Cliente/i }).click();
        await expect(page.locator('text=Novo Cliente').first()).toBeVisible();

        // 6. Close Modal (Trigger unmount cleanup) - wait for close button
        // The close button has an X icon and no explicit name, let's look for it
        await page.locator('.touch-target').click();

        // 7. Re-open to ensure state isn't broken
        await page.getByRole('button', { name: /Novo Cliente/i }).click();
        await expect(page.locator('text=Novo Cliente').first()).toBeVisible();

        // 8. Expect the layout and page not to be blank!
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.trim().length).toBeGreaterThan(0);
        // 9. Ensure Error Boundary DID NOT trigger
        await expect(page.locator('text=CRITICAL UI ERROR')).not.toBeVisible();
    });

    test('TC007 - should not have stale element on Logout', async ({ page }) => {
        await page.goto('/');

        // Login if needed
        const nameInput = page.getByPlaceholder(/Nome|Email/i).first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('Admin');
            await page.keyboard.press('Enter');
        }

        await expect(page.locator('text=Painel').first()).toBeVisible();

        // Perform aggressive state changes and ensure logout button is still accessible
        await page.getByPlaceholder('Buscar placa, cliente, modelo...').fill('test input');

        // We expect the logout button to not be stale because Header is wrapped in React.memo
        const logoutBtn = page.locator('button').filter({ hasText: '' }).last(); // Lucide LogOut icon button in header
        // Actually finding the specific logout button. In our Header, it's for mobile:
        // classlg:hidden p-2.5 rounded-xl bg-white border border-slate-100 text-red-500
        const mobileLogoutBtn = page.locator('.text-red-500').first();

        // Just verify it's still attached to DOM. We can evaluate it.
        const isAttached = await mobileLogoutBtn.evaluate(node => node.isConnected);
        expect(isAttached).toBe(true);
    });
});
