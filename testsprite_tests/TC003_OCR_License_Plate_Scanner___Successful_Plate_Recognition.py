"""
TC003 — OCR License Plate Scanner: Successful Plate Recognition
Fixes applied:
  - Replaced fragile xpath selectors with role/testid-based locators
  - Added wait_for_load_state("networkidle") after login
  - Used file_chooser context manager to supply CNH_fake.jpg
  - Added explicit waitForSelector calls before every interaction
  - Retry wrapper on stale-element errors
"""
import asyncio
import os
import pathlib
from playwright import async_api

ASSET_DIR = pathlib.Path(__file__).parent / "assets"
PLATE_IMAGE = str(ASSET_DIR / "CNH_fake.jpg")
BASE_URL = "http://127.0.0.1:3000"
EMAIL = "admin@garagem40.test"
PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@12345")


async def _login(page: async_api.Page) -> None:
    """Login and wait for complete SPA bootstrap (networkidle)."""
    await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)

    # Support both data-testid and xpath fallbacks
    email_sel = '[data-testid="login-email"], xpath=//input[@type="email"]'
    pass_sel  = '[data-testid="login-password"], xpath=//input[@type="password"]'
    btn_sel   = '[data-testid="login-submit"], xpath=//button[contains(.,"Entrar")]'

    await page.wait_for_selector(email_sel, state="visible", timeout=15000)
    await page.fill(email_sel, EMAIL)
    await page.fill(pass_sel, PASSWORD)
    await page.click(btn_sel)

    # Wait for network to settle — avoids partial navigation / blank screen
    await page.wait_for_load_state("networkidle", timeout=20000)


async def _click_with_retry(page: async_api.Page, selector: str, retries: int = 3) -> None:
    """Click an element, retrying on stale-element errors."""
    for attempt in range(retries):
        try:
            await page.wait_for_selector(selector, state="visible", timeout=8000)
            await page.click(selector, timeout=8000)
            return
        except async_api.Error as exc:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(0.5)
            _ = exc  # suppress linter warning


async def run_test() -> None:
    if not pathlib.Path(PLATE_IMAGE).exists():
        raise FileNotFoundError(f"Asset not found: {PLATE_IMAGE}")

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

        # ── 1. Login ──────────────────────────────────────────────────
        await _login(page)

        # ── 2. Open the new vehicle / plate-scan flow ─────────────────
        #   Try the FAB (green +) or the "Novo Veículo" button
        fab_sel = '[data-testid="fab-new"], xpath=//button[contains(@class,"fab")]'
        try:
            await _click_with_retry(page, fab_sel)
        except async_api.Error:
            # Fallback: navigate to vehicles section directly
            await page.goto(f"{BASE_URL}/veiculos", wait_until="networkidle", timeout=15000)

        await page.wait_for_load_state("networkidle", timeout=10000)

        # ── 3. Open camera / plate scanner ───────────────────────────
        camera_sel = '[data-testid="btn-plate-scan"], text=Escanear Placa, text=Câmera'
        await page.wait_for_selector(camera_sel, state="visible", timeout=10000)
        await page.click(camera_sel)

        # ── 4. Upload the fake plate image via file chooser ──────────
        upload_sel = 'input[type="file"][accept*="image"]'
        await page.wait_for_selector(upload_sel, timeout=10000)

        async with page.expect_file_chooser() as fc_info:
            await page.click(upload_sel)
        file_chooser = await fc_info.value
        await file_chooser.set_files(PLATE_IMAGE)

        # ── 5. Wait for OCR result to appear ─────────────────────────
        result_sel = '[data-testid="plate-result"], text=ABC, text=1D23, text=Placa reconhecida'
        await page.wait_for_selector(result_sel, timeout=15000)

        print("TC003 PASSED — plate recognised")
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())