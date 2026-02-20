from playwright.sync_api import sync_playwright
import time

def verify_modals():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch()
        page = browser.new_page()

        print("Navigating to app...")
        try:
            page.goto("http://localhost:8081")
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for the app to load (look for the coins display or stats button)
        try:
            page.wait_for_selector("text=📊", timeout=120000)
            print("App loaded.")
        except:
            print("App load timeout or selector not found. Taking debug screenshot.")
            page.screenshot(path="debug_load_fail.png")
            return

        # Open Shop
        print("Opening Shop...")
        # Shop button is 🛒
        try:
            page.click("text=🛒", timeout=10000)
        except:
            print("Could not find Shop button. Dumping page text.")
            print(page.inner_text("body"))
            page.screenshot(path="debug_shop_fail.png")
            return

        # Wait for modal content
        try:
            page.wait_for_selector("text=Przekąska", timeout=10000)
            time.sleep(2) # Wait for animation/render

            print("Taking Shop screenshot...")
            page.screenshot(path="shop_modal.png")
        except:
            print("Shop modal content not found.")
            page.screenshot(path="debug_shop_modal_fail.png")

        # Close Modal
        print("Closing Shop...")
        try:
            page.click("text=Zamknij")
            time.sleep(1)
        except:
            print("Could not find Close button.")

        # Open Backpack
        print("Opening Backpack...")
        # Backpack button is 🎒
        try:
            page.click("text=🎒")

            # Wait for modal content
            page.wait_for_selector("text=Posiadasz:", timeout=10000)
            time.sleep(2)

            print("Taking Backpack screenshot...")
            page.screenshot(path="backpack_modal.png")
        except:
            print("Backpack interaction failed.")
            page.screenshot(path="debug_backpack_fail.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_modals()
