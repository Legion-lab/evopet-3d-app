const { test, expect } = require('@playwright/test');

test('HUD and Action Sheet interaction', async ({ page }) => {
  // Navigate to the app. Expo web usually starts on port 8081.
  await page.goto('http://localhost:8081');

  // Wait for the app to load. Look for the Stats button.
  // Sometimes initial load is slow.
  const statsButton = page.getByText('📊');
  await expect(statsButton).toBeVisible({ timeout: 15000 });

  // Open HUD
  await statsButton.click();

  // Check if "Nakarm" button is visible
  const feedButton = page.getByText('Nakarm');
  await expect(feedButton).toBeVisible();

  // Click "Nakarm" to open Food Action Sheet
  await feedButton.click();

  // Check for Action Sheet content "Jedzenie" title
  // HUD has "Głód", not "Jedzenie". So "Jedzenie" should be unique to the sheet.
  await expect(page.getByText('Jedzenie')).toBeVisible();

  // Check for specific buttons
  await expect(page.getByText('Przekąska (Darmowa)')).toBeVisible();
  await expect(page.getByText('Pełny Obiad (10 Monet)')).toBeVisible();

  // Click Close
  await page.getByText('Zamknij').click();

  // Ensure Action Sheet is gone
  await expect(page.getByText('Jedzenie')).not.toBeVisible();

  // Test "Sen" (Sleep) -> Energy Sheet
  const sleepButton = page.getByText('Sen');
  await sleepButton.click();

  // "Energia" exists in HUD and Sheet. Use .last() or filter by visible if HUD is covered (but DOM still has it).
  // HUD "Energia" is visible. Sheet "Energia" is visible.
  // The Sheet is rendered later in the DOM, so .last() should be the sheet title.
  await expect(page.getByText('Energia').last()).toBeVisible();

  // Check for Toggle Sleep button (it might say Uśpij or Obudź)
  await expect(page.getByText(/Uśpij|Obudź/)).toBeVisible();
  await page.getByText('Zamknij').click();

  // Test "Umyj" -> Hygiene Sheet
  const washButton = page.getByText('Umyj');
  await washButton.click();
  // "Higiena" exists in HUD and Sheet.
  await expect(page.getByText('Higiena').last()).toBeVisible();
  await page.getByText('Zamknij').click();

  // Test "Zabawa" -> Play Sheet
  const playButton = page.getByText('Zabawa');
  await playButton.click();
  // "Zabawa" button is in HUD. "Zabawa" title is in Sheet.
  await expect(page.getByText('Zabawa').last()).toBeVisible();
  await expect(page.getByText('Odbijanie piłki')).toBeVisible();
  await page.getByText('Zamknij').click();

});
