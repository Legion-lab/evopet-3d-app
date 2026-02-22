const { test, expect } = require('@playwright/test');

test('Profile and Action Sheet interaction', async ({ page }) => {
  // Navigate to the app. Expo web usually starts on port 8081.
  await page.goto('http://localhost:8081');

  // Wait for the app to load. Look for the Central Button (Paw).
  const profileButton = page.getByText('🐾');
  await expect(profileButton).toBeVisible({ timeout: 15000 });

  // Open Profile Modal
  await profileButton.click();

  // Check if Action Buttons are visible in Profile
  const feedButton = page.getByText('Nakarm');
  const sleepButton = page.getByText('Sen');
  const washButton = page.getByText('Umyj');
  const playButton = page.getByText('Baw się');

  await expect(feedButton).toBeVisible();
  await expect(sleepButton).toBeVisible();
  await expect(washButton).toBeVisible();
  await expect(playButton).toBeVisible();

  // Test "Sen" (Sleep) -> Energy Sheet
  await sleepButton.click();
  // Expect "Energia" header in Action Sheet
  await expect(page.getByText('Energia').last()).toBeVisible();
  // Close Action Sheet (X button)
  await page.getByText('❌').click();

  // Re-open Profile
  await profileButton.click();

  // Test "Umyj" -> Hygiene Sheet (Assuming awake)
  await washButton.click();
  await expect(page.getByText('Higiena').last()).toBeVisible();
  await page.getByText('❌').click();

  // Re-open Profile
  await profileButton.click();

  // Test "Baw się" -> Play Sheet (Assuming awake)
  await playButton.click();
  await expect(page.getByText('Zabawa').last()).toBeVisible();
  await page.getByText('❌').click();

});
