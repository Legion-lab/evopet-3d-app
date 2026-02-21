from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Wait for expo to start...
    print("Navigating to app...")
    try:
        page.goto("http://localhost:8081", timeout=60000)
    except Exception as e:
        print(f"Navigation failed: {e}")
        return

    # Wait for initial load (e.g. Coins)
    try:
        page.wait_for_selector("text=🪙", timeout=30000)
        print("App loaded.")
    except Exception as e:
        print(f"App load failed: {e}")
        page.screenshot(path="load_fail.png")
        return

    # Verify Settings
    print("Clicking Settings...")
    # Find the settings button (⚙️)
    # Since emoji might be tricky, try role button or text
    # The button is a TouchableOpacity, so on web it might be a div with role button or just text.
    # We'll try text.
    settings_btn = page.get_by_text("⚙️")
    if settings_btn.count() > 0:
        settings_btn.click()
        page.wait_for_timeout(1000) # wait for modal animation

        # Check for "SZTUCZNA INTELIGENCJA"
        if page.get_by_text("SZTUCZNA INTELIGENCJA").count() > 0:
            print("SUCCESS: Found 'SZTUCZNA INTELIGENCJA' section.")
        else:
            print("FAILURE: 'SZTUCZNA INTELIGENCJA' not found.")

        # Check for input placeholder
        if page.get_by_placeholder("Wklej klucz OpenAI API").count() > 0:
             print("SUCCESS: Found API Key Input.")
        else:
             print("FAILURE: API Key Input not found.")

        page.screenshot(path="verification_settings.png")

        # Close modal
        close_btn = page.get_by_text("❌")
        if close_btn.count() > 0:
            close_btn.click()
            page.wait_for_timeout(500)
    else:
        print("FAILURE: Settings button not found.")

    # Verify Shop
    print("Clicking Shop...")
    shop_btn = page.get_by_text("🛒")
    if shop_btn.count() > 0:
        shop_btn.click()
        page.wait_for_timeout(1000)

        # Check for Buster 12h
        if page.get_by_text("Buster Głodu 12h").count() > 0:
            print("SUCCESS: Found 'Buster Głodu 12h'.")
        else:
            print("FAILURE: 'Buster Głodu 12h' not found.")

        if page.get_by_text("Buster Energii 12h").count() > 0:
            print("SUCCESS: Found 'Buster Energii 12h'.")
        else:
            print("FAILURE: 'Buster Energii 12h' not found.")

        page.screenshot(path="verification_shop.png")

        # Close modal
        close_btn = page.get_by_text("❌")
        if close_btn.count() > 0:
            close_btn.click()
            page.wait_for_timeout(500)
    else:
        print("FAILURE: Shop button not found.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
