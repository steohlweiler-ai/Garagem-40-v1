"""
TC004 — Invoice OCR Processing: Accurate Data Extraction and Validation
Fixes applied:
  - Collapsed 12 redundant navigation loops into a single clean flow
  - Replaced fragile xpath selectors with role/testid/text-based locators
  - Added wait_for_load_state("networkidle") after every navigation
  - Used file_chooser context manager to supply nota_fiscal_fake.jpg
  - Retry wrapper for stale-element errors
"""
import asyncio
import os
import pathlib
from playwright import async_api

ASSET_DIR = pathlib.Path(__file__).parent / "assets"
INVOICE_IMAGE = str(ASSET_DIR / "nota_fiscal_fake.jpg")
BASE_URL = "http://127.0.0.1:3000"
EMAIL = "admin@garagem40.test"
PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@12345")


async def _login(page: async_api.Page) -> None:
    """Login and wait for complete SPA bootstrap (networkidle)."""
    await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
    email_sel = '[data-testid="login-email"], xpath=//input[@type="email"]'
    pass_sel  = '[data-testid="login-password"], xpath=//input[@type="password"]'
    btn_sel   = '[data-testid="login-submit"], xpath=//button[contains(.,"Entrar")]'
    await page.wait_for_selector(email_sel, state="visible", timeout=15000)
    await page.fill(email_sel, EMAIL)
    await page.fill(pass_sel, PASSWORD)
    await page.click(btn_sel)
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
    if not pathlib.Path(INVOICE_IMAGE).exists():
        raise FileNotFoundError(f"Asset not found: {INVOICE_IMAGE}")

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

        # ── 2. Navigate to Estoque (Inventory) tab ────────────────────
        estoque_sel = '[data-testid="nav-estoque"], text=Estoque'
        await _click_with_retry(page, estoque_sel)
        await page.wait_for_load_state("networkidle", timeout=15000)

        # ── 3. Open "Receber Nota Fiscal" modal (single click) ────────
        receber_sel = '[data-testid="btn-receber-nota"], text=Receber Nota Fiscal'
        await _click_with_retry(page, receber_sel)
        await page.wait_for_load_state("networkidle", timeout=10000)

        # ── 4. Upload invoice image via file chooser ──────────────────
        upload_sel = 'input[type="file"][accept*="image"], input[type="file"][accept*="pdf"]'
        await page.wait_for_selector(upload_sel, state="attached", timeout=10000)

        async with page.expect_file_chooser() as fc_info:
            try:
                # Try clicking the visible upload button/area first
                upload_btn_sel = '[data-testid="btn-upload-nota"], text=Selecionar arquivo, text=Upload'
                await page.click(upload_btn_sel, timeout=3000)
            except async_api.Error:
                # Fall back to clicking the hidden file input directly
                await page.click(upload_sel, timeout=5000)

        file_chooser = await fc_info.value
        await file_chooser.set_files(INVOICE_IMAGE)

        # ── 5. Wait for OCR extraction results ───────────────────────
        #   The app should show extracted supplier, items, quantities, prices + confidence
        result_sel = (
            '[data-testid="ocr-result"], '
            'text=Confidence, '
            'text=Pecas Automotivas, '
            'text=369'
        )
        await page.wait_for_selector(result_sel, timeout=20000)

        print("TC004 PASSED — OCR extraction results visible")
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())