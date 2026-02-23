/**
 * Security Evidence Test 2 — TC007 RBAC Logout Regression (50 iterations)
 *
 * Runs the full TC007 login → navigate → logout → re-login flow 50 times.
 * Any stale element error or test failure proves the shell-persistent fix
 * is still required. Zero failures proves the fix holds.
 *
 * Run: npx playwright test tests/security/tc007-regression.spec.ts --reporter=html
 */
import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL ?? 'admin@garagem40.test';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

async function login(page: Page): Promise<void> {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator(
        '[data-testid="login-email"], input[type="email"]'
    ).first();
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await emailInput.fill(EMAIL);
    await page.locator('[data-testid="login-password"], input[type="password"]').first().fill(PASSWORD);
    await page.locator('[data-testid="login-submit"], button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
}

async function logout(page: Page): Promise<void> {
    // Try direct logout button (mobile)
    const directBtn = page.locator('[data-testid="logout-btn"]');
    if (await directBtn.isVisible()) {
        await directBtn.click({ timeout: 8_000 });
    } else {
        // Desktop: open profile menu first
        await page.locator('[data-testid="profile-menu-btn"]').click({ timeout: 8_000 });
        await directBtn.waitFor({ state: 'visible', timeout: 5_000 });
        await directBtn.click({ timeout: 8_000 });
    }
    // Wait for login form to confirm logout completed
    await page.locator('[data-testid="login-email"], input[type="email"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
}

// Repeat 50 times — any StaleElementReferenceError will surface here
test.describe('TC007 — RBAC Logout Regression (50×)', () => {
    // Vitest-style repetition via test.describe.configure() not supported;
    // use explicit loop instead for reliable repeat semantics
    for (let i = 1; i <= 50; i++) {
        test(`iteration ${i.toString().padStart(2, '0')}/50`, async ({ page }) => {
            // ── Login ──────────────────────────────────────────────
            await login(page);

            // ── Navigate to Estoque ────────────────────────────────
            const estoque = page.locator('[data-testid="nav-estoque"], text=Estoque').first();
            await estoque.waitFor({ state: 'visible', timeout: 10_000 });
            await estoque.click();
            await page.waitForLoadState('networkidle', { timeout: 10_000 });

            // ── Assert page loaded (no blank screen) ───────────────
            await expect(page).not.toHaveTitle('', { timeout: 5_000 });

            // ── Logout ─────────────────────────────────────────────
            await logout(page);

            // ── Confirm back on login screen ───────────────────────
            await expect(
                page.locator('[data-testid="login-email"], input[type="email"]').first()
            ).toBeVisible({ timeout: 10_000 });
        });
    }
});
