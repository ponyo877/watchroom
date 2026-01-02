import { test, expect } from '@playwright/test';

test.describe('Logo and Favicon', () => {
  test('should display logo image in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Find the logo image
    const logo = page.locator('header img[alt="WatchRoom"]');
    await expect(logo).toBeVisible();

    // Verify logo source
    const src = await logo.getAttribute('src');
    expect(src).toBe('/logo.svg');
  });

  test('should have favicon set correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Check favicon link element
    const favicon = page.locator('link[rel="icon"]');
    const href = await favicon.getAttribute('href');
    expect(href).toBe('/favicon.svg');
  });

  test('logo should navigate to home page', async ({ page, request }) => {
    // Create a room to have a different URL
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: `test-room-${Date.now()}` },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to room page
    await page.goto(`/r/${shortId}`);
    await page.waitForSelector('button[title="NewVideo"]', { timeout: 10000 });

    // Click on home link (leave room button goes home)
    const leaveButton = page.locator('button[title="部屋を出る"]');
    await leaveButton.click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('logo.svg should be accessible', async ({ request }) => {
    const response = await request.get('http://localhost:5173/logo.svg');
    expect(response.ok()).toBe(true);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/svg+xml');
  });

  test('favicon.svg should be accessible', async ({ request }) => {
    const response = await request.get('http://localhost:5173/favicon.svg');
    expect(response.ok()).toBe(true);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/svg+xml');
  });
});
