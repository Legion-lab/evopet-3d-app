const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to app
  try {
    await page.goto('http://localhost:8081');
  } catch (e) {
    console.log('Error navigating to app:', e);
    process.exit(1);
  }

  // Wait for load
  await page.waitForTimeout(5000);

  // 1. Verify Shop Modal Styling
  console.log('Verifying Shop Modal...');
  try {
      await page.click('text=🛒');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_shop_new.png' });
      console.log('Shop Modal screenshot saved.');
      // Close Shop (click outside or X? The X is inside overlay but outside card?)
      // My code hides global X for Shop/Backpack?
      // No, I hid the header text, but the close button is still there at top right?
      // Let's check App.js close button logic.
      // <TouchableOpacity onPress={() => setActiveModal(null)} style={...}>X</TouchableOpacity>
      // It is rendered inside modalContent.
      // modalContent is full screen transparent.
      // closeButton is absolute top:10 right:10.
      // So clicking top right should close it.
      await page.mouse.click(350, 20); // Top right roughly
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Shop:', e);
  }

  // 2. Verify Backpack Modal Styling
  console.log('Verifying Backpack Modal...');
  try {
      await page.click('text=🎒'); // Backpack icon
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_backpack_new.png' });
      console.log('Backpack Modal screenshot saved.');
      await page.mouse.click(350, 20); // Close
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Backpack:', e);
  }

  // 3. Verify Feed Mode
  console.log('Verifying Feed Mode...');
  try {
      await page.click('text=🐾'); // Open Profile
      await page.waitForTimeout(1000);
      await page.click('text=Nakarm'); // Feed button
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_feed_mode.png' });
      console.log('Feed Mode screenshot saved.');
      await page.click('text=X'); // Close mode
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Feed Mode:', e);
  }

  // 4. Verify Play Mode
  console.log('Verifying Play Mode...');
  try {
      await page.click('text=🐾'); // Open Profile
      await page.waitForTimeout(1000);
      await page.click('text=Baw się'); // Play button
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_play_mode.png' });
      console.log('Play Mode screenshot saved.');
      await page.click('text=X'); // Close mode
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Play Mode:', e);
  }

  // 5. Verify Wash Mode
  console.log('Verifying Wash Mode...');
  try {
      await page.click('text=🐾'); // Open Profile
      await page.waitForTimeout(1000);
      await page.click('text=Umyj'); // Wash button
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_wash_mode.png' });
      console.log('Wash Mode screenshot saved.');
      await page.click('text=X'); // Close mode
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Wash Mode:', e);
  }

  // 6. Verify Sleep Mode
  console.log('Verifying Sleep Mode...');
  try {
      await page.click('text=🐾'); // Open Profile
      await page.waitForTimeout(1000);
      await page.click('text=Sen'); // Sleep button
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification_sleep_mode.png' });
      console.log('Sleep Mode screenshot saved.');
      await page.click('text=☀️ Obudź'); // Wake button
      await page.waitForTimeout(1000);
  } catch (e) {
      console.log('Error verifying Sleep Mode:', e);
  }

  await browser.close();
})();
