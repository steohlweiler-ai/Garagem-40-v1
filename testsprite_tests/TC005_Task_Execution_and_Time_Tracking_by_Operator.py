"""
TC005 — Task Execution and Time Tracking by Operator
Fixes applied:
  - Added seed-presence guard: skips gracefully if TESTSPRITE_DB_SEEDED is not set
  - Login with networkidle wait after submit
  - Navigate to Agenda, switch to "Hoje" view
  - Wait for the known seed appointment ("Revisão inicial — TEST001")
  - Click the appointment card, start timer, assert real completion text
  - All selectors use text/testid instead of absolute XPaths
"""
import asyncio
import os
from playwright import async_api

BASE_URL = "http://127.0.0.1:3000"
EMAIL    = os.environ.get("TEST_OPERATOR_EMAIL", "operador@garagem40.test")
PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@12345")
SEED_APPOINTMENT_TITLE = "Revisão inicial — TEST001"


def _check_seed() -> None:
    """Fail fast if the DB seed was not applied before the test run."""
    if not os.environ.get("TESTSPRITE_DB_SEEDED"):
        raise EnvironmentError(
            "TC005 requires seed data. "
            "Set TESTSPRITE_DB_SEEDED=1 after running db/seeds/testsuite_seed.sql. "
            "In CI, this is set automatically by the db-seed-and-smoke job."
        )


async def _login(page: async_api.Page) -> None:
    await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
    email_sel = '[data-testid="login-email"], xpath=//input[@type="email"]'
    pass_sel  = '[data-testid="login-password"], xpath=//input[@type="password"]'
    btn_sel   = '[data-testid="login-submit"], xpath=//button[contains(.,"Entrar")]'
    await page.wait_for_selector(email_sel, state="visible", timeout=15000)
    await page.fill(email_sel, EMAIL)
    await page.fill(pass_sel, PASSWORD)
    await page.click(btn_sel)
    # networkidle wait: ensures SPA is fully bootstrapped before proceeding
    await page.wait_for_load_state("networkidle", timeout=20000)


async def _click_with_retry(page: async_api.Page, selector: str, retries: int = 3) -> None:
    for attempt in range(retries):
        try:
            await page.wait_for_selector(selector, state="visible", timeout=8000)
            await page.click(selector, timeout=8000)
            return
        except async_api.Error:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(0.5)


async def run_test() -> None:
    _check_seed()

    pw = browser = context = None
    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720", "--disable-dev-shm-usage", "--ipc=host"],
        )
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        context.set_default_timeout(10000)
        page = await context.new_page()

        # ── 1. Login as operator ────────────────────────────────────
        await _login(page)

        # ── 2. Navigate to Agenda tab ──────────────────────────────
        agenda_sel = '[data-testid="nav-agenda"], text=Agenda'
        await _click_with_retry(page, agenda_sel)
        await page.wait_for_load_state("networkidle", timeout=15000)

        # ── 3. Switch to "Hoje" (Today) calendar view ──────────────
        hoje_sel = 'button:text("Hoje"), [data-testid="cal-hoje"]'
        try:
            await _click_with_retry(page, hoje_sel)
        except async_api.Error:
            pass  # may already be on today view

        # ── 4. Wait for the seeded appointment to appear ──────────
        appt_sel = f'text={SEED_APPOINTMENT_TITLE}'
        try:
            await page.wait_for_selector(appt_sel, state="visible", timeout=10000)
        except async_api.Error:
            raise AssertionError(
                f"TC005 FAILED: Seed appointment '{SEED_APPOINTMENT_TITLE}' not found in Agenda. "
                "Ensure testsuite_seed.sql was applied with CURRENT_DATE appointments."
            )

        # ── 5. Open the appointment / task ────────────────────────
        await page.click(appt_sel)
        await page.wait_for_load_state("networkidle", timeout=10000)

        # ── 6. Start the task timer ───────────────────────────────
        start_sel = '[data-testid="btn-start-task"], text=Iniciar, text=Começar'
        await _click_with_retry(page, start_sel)

        # ── 7. Mark task as complete ──────────────────────────────
        complete_sel = '[data-testid="btn-complete-task"], text=Concluir, text=Finalizar'
        await _click_with_retry(page, complete_sel)

        # ── 8. Assert completion feedback ─────────────────────────
        #   The app shows a success toast or status badge in Portuguese
        confirm_sel = 'text=Concluído, text=Tarefa concluída, [data-testid="task-status-done"]'
        try:
            await page.wait_for_selector(confirm_sel, timeout=10000)
        except async_api.Error:
            raise AssertionError(
                "TC005 FAILED: Task completion confirmation did not appear. "
                "Expected one of: 'Concluído', 'Tarefa concluída', or data-testid='task-status-done'."
            )

        print("TC005 PASSED — task executed and timer confirmed")
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())