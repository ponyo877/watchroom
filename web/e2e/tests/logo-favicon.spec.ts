import { test, expect } from '@playwright/test';

test.describe('Logo and Favicon', () => {
  test('should display logo and favicon correctly', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Check logo image is visible (use .logo-light class for light theme logo)
    const logo = page.locator('header img.logo-light[alt="WatchRoom"]');
    await expect(logo).toBeVisible();
    const src = await logo.getAttribute('src');
    expect(src).toBe('/logo.svg');

    // Check favicon is set
    const favicon = page.locator('link[rel="icon"]');
    const href = await favicon.getAttribute('href');
    expect(href).toBe('/favicon.svg');

    // Verify assets are accessible
    const logoResponse = await request.get('http://localhost:5173/logo.svg');
    expect(logoResponse.ok()).toBe(true);

    const faviconResponse = await request.get('http://localhost:5173/favicon.svg');
    expect(faviconResponse.ok()).toBe(true);
  });
});
