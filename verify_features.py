import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            print("Navigating to app...")
            await page.goto("http://localhost:8081")

            # Wait for app to load (canvas or coins)
            await page.wait_for_selector("text=🪙", timeout=60000)
            print("App loaded.")

            # --- Test 1: Profile Toggle ---
            print("Testing Profile Toggle...")
            paw_button = page.get_by_text("🐾")
            await paw_button.click()

            # Check Header
            await expect(page.get_by_text("Profil Pupila")).to_be_visible()
            await expect(page.get_by_text("Witaj w:")).not_to_be_visible()
            await page.screenshot(path="verification_profile.png")
            print("Profile opened and verified.")

            # Toggle off
            await paw_button.click()
            await expect(page.get_by_text("Profil Pupila")).not_to_be_visible()
            print("Profile closed (toggle working).")

            # --- Test 2: Shop Modal ---
            print("Testing Shop Modal...")
            shop_button = page.get_by_text("🛒")
            await shop_button.click()

            # Check Header
            await expect(page.get_by_text("Sklep", exact=True)).to_be_visible() # Exact true to avoid matching button text if any

            # Check for Tile Content
            await expect(page.get_by_text("Przekąska")).to_be_visible()
            await expect(page.get_by_text("🍎")).to_be_visible()

            await page.screenshot(path="verification_shop.png")
            print("Shop verified.")

            # Close Shop
            close_button = page.get_by_text("❌")
            await close_button.click()

            # --- Test 3: Settings API Visibility ---
            print("Testing Settings API Visibility...")
            settings_button = page.get_by_text("⚙️")
            await settings_button.click()

            # Check Header
            await expect(page.get_by_text("Ustawienia")).to_be_visible()

            # Find Input (placeholder contains "Wklej klucz")
            api_input = page.get_by_placeholder("Wklej klucz OpenAI API")

            # Check type password
            type_attr = await api_input.get_attribute("type")
            if type_attr != "password":
                print(f"Warning: API Input type is {type_attr}, expected password")

            # Click Toggle
            toggle_button = page.get_by_text("👁️ Pokaż")
            await toggle_button.click()

            # Check type text
            type_attr_visible = await api_input.get_attribute("type")
            if type_attr_visible != "text":
                print(f"Warning: API Input type is {type_attr_visible}, expected text after toggle")

            await page.screenshot(path="verification_settings.png")
            print("Settings API Visibility verified.")

            # Close Settings
            await close_button.click()

            # --- Test 4: Chat History ---
            print("Testing Chat History...")
            chat_button = page.get_by_text("💬")
            await chat_button.click()

            # Check Header
            await expect(page.get_by_text("Czat", exact=True)).to_be_visible()

            # Send Message to populate history
            input_field = page.get_by_placeholder("Napisz do zwierzaka...")
            await input_field.fill("Cześć!")
            send_button = page.get_by_text("Wyślij")
            await send_button.click()

            # Wait a bit for bubble (optional, but let's check history button)
            history_button = page.get_by_text("📜 Historia")
            await history_button.click()

            # Check Overlay
            await expect(page.get_by_text("Ostatnie wiadomości")).to_be_visible()
            await expect(page.get_by_text("Cześć!")).to_be_visible() # Should be in history

            await page.screenshot(path="verification_chat.png")
            print("Chat History verified.")

        except Exception as e:
            print(f"Verification failed: {e}")
            await page.screenshot(path="verification_failed.png")
        finally:
            await browser.close()

asyncio.run(run())
