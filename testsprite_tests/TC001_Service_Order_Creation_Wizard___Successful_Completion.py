import asyncio
import os
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)

        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass

        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://127.0.0.1:3000
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)
        
        # -> Fill the email and password fields and click 'Entrar no Sistema' to log in.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div/div[2]/form/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill(os.environ.get('TEST_USER_EMAIL', 'admin@garagem40.test'))
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill(os.environ.get('TEST_USER_PASSWORD', ''))
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the new service order creation wizard by clicking the floating create/new-order button (likely the green '+'), then proceed to the client selection step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill vehicle fields (plate, model, brand, color, delivery datetime) and proceed to the next step (CLIENTE).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[3]/div/div[1]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ABC1234')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[3]/div/div[2]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Corolla')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[3]/div/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Toyota')
        
        # -> Open the Clients page to select an existing client or create a new client for the service order (navigate to client selection).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Create a new client by clicking the 'Novo Cliente' button to proceed with the service order client step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[1]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill the new client form (Nome Completo, WhatsApp/Telefone, CPF/CNPJ, Endereço) and click 'Salvar Cadastro' to create the client and return to client selection.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('João Silva')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[2]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('(11) 91234-5678')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123.456.789-09')
        
        # -> Open the Clientes page to continue the client creation flow (re-open the client modal or save the client). Click the 'Clientes' navigation button.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Novo Cliente' modal so the address can be filled and the client saved (click the '+ Novo Cliente' button). Immediately click the 'Novo Cliente' button to proceed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[1]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the new service order creation modal using the floating create button (bottom-right) to continue client selection and resume saving the new client.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the floating create/new-order button (bottom-right) to open the service order creation wizard so the client/vehicle steps can be resumed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the floating create/new-order button (bottom-right) to open the service order creation wizard and resume client/vehicle steps.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill vehicle color and delivery datetime in the VEÍCULO step, then click 'Próximo Passo' to advance to the CLIENTE step.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[3]/div/div[3]/div[1]/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Preto')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[3]/div/div[3]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2026-02-10T10:00')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[4]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Clients page to create/save the new client (click 'Clientes' navigation button).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the new service order creation wizard by clicking the floating create/new-order button (bottom-right) to resume the client/vehicle steps.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click 'Próximo Passo' to advance from VEÍCULO to CLIENTE step in the wizard.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[4]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Re-open the New Service Order creation modal with a fresh click on the floating create button so the wizard elements are current, then retry advancing to the CLIENTE step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the floating create / new-order button to open the 'Nova Ordem de Serviço' wizard so the client selection step can be resumed (use the visible floating create button).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Próximo Passo' button in the VEÍCULO step to advance to the CLIENTE step of the wizard.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[4]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the floating create / new-order button to open the 'Nova Ordem de Serviço' wizard (use a fresh element index).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    