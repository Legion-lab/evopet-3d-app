from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:8081")
        print("Page loaded")
    except Exception as e:
        print(f"Error loading page: {e}")
        return

    # Wait for load
    page.wait_for_timeout(10000)

    # 1. Verify Shop Modal
    print("Verifying Shop Modal...")
    try:
        page.get_by_text("🛒").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_shop_py.png")
        print("Shop screenshot saved.")
        # Close Shop
        page.get_by_text("❌").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Shop: {e}")

    # 2. Verify Backpack Modal
    print("Verifying Backpack Modal...")
    try:
        page.get_by_text("🎒").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_backpack_py.png")
        print("Backpack screenshot saved.")
        page.get_by_text("❌").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Backpack: {e}")

    # 3. Verify Feed Mode
    print("Verifying Feed Mode...")
    try:
        page.get_by_text("🐾").click()
        page.wait_for_timeout(1000)
        page.get_by_text("Nakarm").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_feed_py.png")
        print("Feed screenshot saved.")
        page.get_by_text("X").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Feed: {e}")

    # 4. Verify Play Mode
    print("Verifying Play Mode...")
    try:
        page.get_by_text("🐾").click()
        page.wait_for_timeout(1000)
        page.get_by_text("Baw się").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_play_py.png")
        print("Play screenshot saved.")
        page.get_by_text("X").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Play: {e}")

    # 5. Verify Wash Mode
    print("Verifying Wash Mode...")
    try:
        page.get_by_text("🐾").click()
        page.wait_for_timeout(1000)
        page.get_by_text("Umyj").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_wash_py.png")
        print("Wash screenshot saved.")
        page.get_by_text("X").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Wash: {e}")

    # 6. Verify Sleep Mode
    print("Verifying Sleep Mode...")
    try:
        page.get_by_text("🐾").click()
        page.wait_for_timeout(1000)
        page.get_by_text("Sen").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_sleep_py.png")
        print("Sleep screenshot saved.")
        page.get_by_text("☀️ Obudź").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error verifying Sleep: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
