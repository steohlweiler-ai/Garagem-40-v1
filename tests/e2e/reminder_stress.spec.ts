
import { test, expect } from '@playwright/test';

/**
 * Reminder Mutation Stress Tests (Phase 2B Validation)
 * 1) Multi-tab simultaneous status marking
 * 2) Creating reminder while offline
 * 3) Circuit breaker flow
 * 4) Rapid navigation during creation
 */

test.describe('Reminder Mutation Resilience', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Open a specific service detail modal
        await page.click('.w-full.bg-white.p-4.rounded-3xl');
        await page.waitForSelector('.fixed.inset-0.z-50');
    });

    test('Concorrência - Duas abas marcando o mesmo lembrete', async ({ page, context }) => {
        // 1. Create a reminder first if none exists
        const reminderCount = await page.locator('button:has-text("Alertas Internos")').count();

        // Add a reminder
        await page.click('button:has-text("Lembretes")');
        await page.fill('input[placeholder="Título do Lembrete..."]', 'Teste de Concorrência');
        await page.click('button:has-text("Salvar")');

        // 2. Open second tab
        const page2 = await context.newPage();
        await page2.goto('/');
        await page2.click('.w-full.bg-white.p-4.rounded-3xl');

        // Locate the toggle button in both pages
        const toggle1 = page.locator('button:has(svg.lucide-refresh-cw), button:has(svg.lucide-check), button:has(svg.lucide-circle)').first();
        const toggle2 = page2.locator('button:has(svg.lucide-refresh-cw), button:has(svg.lucide-check), button:has(svg.lucide-circle)').first();

        // 3. Mark simultaneously
        await Promise.all([
            toggle1.click(),
            toggle2.click()
        ]);

        // 4. Verify eventual consistency
        // Both should show the 'done' state (green) after mutations settle
        await expect(toggle1).toHaveClass(/bg-green-500/);
        await expect(toggle2).toHaveClass(/bg-green-500/);
    });

    test('Offline durante criação de lembrete', async ({ page, context }) => {
        await context.setOffline(true);

        await page.click('button:has-text("Lembretes")');
        await page.fill('input[placeholder="Título do Lembrete..."]', 'Lembrete Offline');
        await page.click('button:has-text("Salvar")');

        // Optimistic update should add it to UI
        await expect(page.locator('text=Lembrete Offline')).toBeVisible();

        // Wait for failure and rollback
        await page.waitForTimeout(2000);

        // Should be gone after rollback
        await expect(page.locator('text=Lembrete Offline')).not.toBeVisible();

        await context.setOffline(false);
    });

    test('Circuit Breaker desabilitando ações de lembrete', async ({ page }) => {
        // Mock the RPC endpoint to return 500
        await page.route('**/rpc/set_reminder_status_atomic', async route => {
            await route.fulfill({ status: 500 });
        });

        // Trigger failure 6 times
        for (let i = 0; i < 6; i++) {
            await page.click('button:has(svg.lucide-check), button:has(svg.lucide-circle)');
            await page.waitForTimeout(100);
        }

        // Modal or toast should show maintenance
        await expect(page.locator('text=manutenção automática')).toBeVisible();
    });
});
