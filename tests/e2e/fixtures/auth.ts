/**
 * Reusable auth helpers for Playwright E2E specs.
 * Credentials point to the org-test seed users created by testsuite_seed.sql.
 */
import { Page } from '@playwright/test';

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'Test@12345';

const CREDENTIALS = {
    admin: { email: 'admin@garagem40.test', password: TEST_PASSWORD },
    operador: { email: 'operador@garagem40.test', password: TEST_PASSWORD },
    financeiro: { email: 'financeiro@garagem40.test', password: TEST_PASSWORD },
} as const;

export type Role = keyof typeof CREDENTIALS;

/**
 * Navigate to the app root and log in as the given role.
 * Waits for DOM, fills credentials, submits, then waits for networkidle
 * to ensure the SPA is fully bootstrapped before returning.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
    const { email, password } = CREDENTIALS[role];

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the login form to be ready
    await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    // Wait for network to settle — avoids partial navigation
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
}

/**
 * Log out from any authenticated session.
 * Retries up to 3 times to handle stale-element scenarios in the header dropdown.
 */
export async function logout(page: Page): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const logoutBtn = page.getByTestId('logout-btn');
            // If not directly visible, open the profile dropdown first
            if (!(await logoutBtn.isVisible())) {
                await page.getByTestId('profile-menu-btn').click();
                await logoutBtn.waitFor({ state: 'visible', timeout: 5_000 });
            }
            await logoutBtn.click();
            // Confirm we're back at the login form
            await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 10_000 });
            return;
        } catch {
            if (attempt === 2) throw new Error('logout() failed after 3 attempts — stale element not resolved');
            await page.waitForTimeout(500);
        }
    }
}
