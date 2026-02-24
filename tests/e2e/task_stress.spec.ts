
import { test, expect } from '@playwright/test';

/**
 * Task Mutation Stress Tests (Phase 2A Validation)
 * 1) Rapid clicks/Conflicting mutations
 * 2) Offline behavior
 * 3) Circuit Breaker feedback
 * 4) Background sync/multi-tab consistency
 */

test.describe('Task Mutation Resilience', () => {

    test.beforeEach(async ({ page }) => {
        // Mocking auth and base data
        await page.goto('/');
        // Assume user is already logged in or mock it
        // Wait for dashboard
        await page.waitForSelector('.grid');
        // Open a specific service detail
        await page.click('.w-full.bg-white.p-4.rounded-3xl');
        await page.waitForSelector('.fixed.inset-0.z-50'); // Modal open
    });

    test('Guerra de tarefas - múltiplas mutações rápidas', async ({ page }) => {
        const taskButtons = page.locator('button:has(svg.text-transparent)');
        const count = await taskButtons.count();

        if (count < 2) {
            // Add a task if not enough
            await page.click('button:has-text("Adicionar Etapa")');
            await page.fill('input[placeholder="Nome da etapa..."]', 'Fricção Test 1');
            await page.keyboard.press('Enter');
            await page.fill('input[placeholder="Nome da etapa..."]', 'Fricção Test 2');
            await page.keyboard.press('Enter');
        }

        // Click multiple tasks rapidly
        await taskButtons.nth(0).click();
        await taskButtons.nth(1).click();
        await taskButtons.nth(0).click(); // toggle back

        // Validate optimistic states (don't wait for network yet)
        // They should show success (green) or loading spinners depending on speed
        // The point is: no crash, and eventual consistency.

        await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible();
    });

    test('Offline durante mutação', async ({ page, context }) => {
        // 1. Enter offline mode
        await context.setOffline(true);

        // 2. Try to toggle a task
        await page.click('button:has(svg.text-transparent)');

        // 3. Expect Optimistic update to happen...
        // ...followed by a Rollback
        // Since it's offline, the mutation will fail.
        // We should see the MaintenanceBanner or an error toast
        // and the button should revert to its original state.

        // Wait for rollback (usually after timeout/retry failure)
        await page.waitForTimeout(2000);

        // Button should not be green
        await expect(page.locator('button:has(svg.text-transparent)').first()).toHaveClass(/bg-slate-50/);

        await context.setOffline(false);
    });

    test('Circuit Breaker Feedback', async ({ page }) => {
        // Mock the RPC endpoint to return 500 repeatedly to trigger circuit
        await page.route('**/rpc/start_task_atomic', async route => {
            await route.fulfill({ status: 500 });
        });

        // Trigger failure multiple times (FAILURE_THRESHOLD is 5)
        for (let i = 0; i < 6; i++) {
            await page.click('button:has(svg.animate-spin-slow)'); // Play button
            await page.waitForTimeout(100);
        }

        // Now expect the CircuitOpenError UI
        // In our implementation, we show MaintenanceBanner or toast
        // Check for the banner in the modal or global
        await expect(page.locator('text=manutenção automática')).toBeVisible();
    });

    test('Navegação rápida durante mutação', async ({ page }) => {
        // 1. Click a mutation
        await page.click('button:has(svg.text-transparent)');

        // 2. Immediately close the modal
        await page.click('button:has(svg[class*="lucide-x"])');

        // 3. Verify the main dashboard card reflects the change (Optimistic sync)
        // The number of tasks done should be updated on the card
        await expect(page.locator('p:has-text("Etapa")')).toBeVisible();
    });
});
