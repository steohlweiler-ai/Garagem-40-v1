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
        
        # -> Fill email and password fields with provided credentials and click 'Entrar no Sistema' to log in.
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
        
        # -> Filter for completed ('Pronto') service orders and open a completed service order to access the print/report options.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/main/section/div/div[1]/button[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Total' button to display all vehicles and locate any service orders (so a service order can be opened and its printable report options accessed).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[1]/button[6]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Clients area to locate a client profile (if any) so client history report can be generated, or to confirm no clients/service orders exist and report inability to verify printable reports.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Wait 3 seconds for the SPA to attempt to render. If interactive elements appear, proceed to locate completed service orders/clients. If still blank, reload the app by navigating to http://127.0.0.1:3000 to recover the UI.
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)
        
        # -> Reload the application (navigate to http://127.0.0.1:3000) to recover the SPA UI and reveal interactive elements so the report verification steps can continue.
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)
        
        # -> Recover the SPA UI so interactive elements appear. Wait up to 3 seconds for rendering; if still blank, reload the app (navigate to http://127.0.0.1:3000 in the same tab) to reveal interactive elements and continue with locating completed service orders and client profiles.
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)
        
        # -> Open the Clients area to check for client profiles (click the 'Clientes' button) so client history report generation can be attempted. If no clients exist, report inability to verify printable reports due to missing data.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Clientes' button again to load the client list; if clients appear, open a client profile to generate/print the client history report.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Novo Cliente' form so a test client can be created (to later create a service order and print reports).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[1]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Wait up to 3 seconds for the SPA to render. If interactive elements appear, proceed to locate 'Ordens de Serviço' or 'Clientes' to continue report verification. If still blank, reload the application by navigating to http://127.0.0.1:3000 in the same tab to recover the UI.
        await page.goto("http://127.0.0.1:3000", wait_until="commit", timeout=10000)
        
        # -> Open the UI control to create a new client (use the floating/add button) so test data can be created for printing reports.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill the vehicle fields (Modelo, Marca, Cor, Entrega Prevista) and click 'Próximo Passo' to proceed to the CLIENTE step of the new order flow so a client can be created.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/div/div[2]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Corolla')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/div/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Toyota')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/div/div[3]/div[1]/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Branco')
        
        # -> Open the New Service Order modal (use floating add button) to get back to the CLIENTE step and create a test client so a service order can be completed and reports printed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Advance to the CLIENTE step of the New Service Order flow by clicking 'Próximo Passo', then create a new client so a service order can be completed and printable reports can be generated.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[4]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the New Service Order / add modal so client creation can continue (use floating/add button). Once modal is open, proceed to CLIENTE step and create a new client.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Advance the New Service Order flow to the CLIENTE step by clicking 'Próximo Passo' so a new client can be created.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[3]/div/div[4]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the New Service Order modal using the floating add button (index 3720) so the CLIENTE step can be accessed and a test client can be created.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Clients area to create a test client (click 'Clientes' to load client list) so a client profile can be created and used to generate reports.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/nav/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Novo Cliente' form to create a test client so a service order can be created and printable reports generated.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[1]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill the 'Novo Cliente' form (Nome, WhatsApp/Telefone, CPF/CNPJ, Endereço) and click 'Salvar Cadastro' to create a test client.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('João Silva')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[2]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('(11) 98888-7777')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/div[2]/main/section/div/div[3]/div/div[2]/div[1]/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('12345678909')
        
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    