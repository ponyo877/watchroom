import { test, expect } from '@playwright/test';
import { LOL_CHAMPIONS } from '../../src/lib/champions';

test.describe('User Name Generation', () => {
  test('initial username should be a LoL champion name', async ({ browser }) => {
    // Create a fresh context without any stored user data
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to home page
      await page.goto('/');

      // Wait for the page to load
      await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

      // Get user name from localStorage
      const userStorage = await page.evaluate(() => {
        return localStorage.getItem('user-storage');
      });

      expect(userStorage).not.toBeNull();

      const parsed = JSON.parse(userStorage!);
      const userName = parsed.state.name;

      // Verify username is not empty
      expect(userName).toBeTruthy();

      // Verify username does NOT start with "Guest_"
      expect(userName.startsWith('Guest_')).toBe(false);

      // Verify username is a valid LoL champion name
      expect(LOL_CHAMPIONS).toContain(userName);
    } finally {
      await context.close();
    }
  });

  test('username should persist across page reloads', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

      // Get initial username
      const initialStorage = await page.evaluate(() => {
        return localStorage.getItem('user-storage');
      });
      const initialName = JSON.parse(initialStorage!).state.name;

      // Reload page
      await page.reload();
      await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

      // Get username after reload
      const reloadedStorage = await page.evaluate(() => {
        return localStorage.getItem('user-storage');
      });
      const reloadedName = JSON.parse(reloadedStorage!).state.name;

      // Username should persist
      expect(reloadedName).toBe(initialName);
    } finally {
      await context.close();
    }
  });
});
