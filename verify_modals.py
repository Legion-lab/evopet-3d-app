from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8081")

    # Wait for load
    page.wait_for_timeout(5000)

    # Open Shop
    shop_btn = page.get_by_text("🛒")
    shop_btn.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="shop_verification.png")

    # Close Shop
    page.get_by_text("❌").click()
    page.wait_for_timeout(5000)

    # Open Backpack
    backpack_btn = page.get_by_text("🎒")
    backpack_btn.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="backpack_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
