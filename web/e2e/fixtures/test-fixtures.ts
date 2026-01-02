import { test as base, expect, Page, BrowserContext } from '@playwright/test';

/**
 * User session for multi-user P2P tests
 */
interface UserSession {
  context: BrowserContext;
  page: Page;
  userId: string;
  userName: string;
}

/**
 * Extended test fixtures for WatchRoom E2E tests
 */
interface TestFixtures {
  /** Create a new user session with unique context */
  createUser: (name: string) => Promise<UserSession>;
  /** Home page helper */
  homePage: HomePage;
  /** Room page helper */
  roomPage: RoomPage;
}

/**
 * Home page object
 */
class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateRoom() {
    await this.page.click('button:has-text("NewRoom")');
  }

  async fillRoomName(name: string) {
    await this.page.fill('input#roomName', name);
  }

  async fillPassword(password: string) {
    await this.page.fill('input#password', password);
  }

  async submitCreateRoom() {
    await this.page.click('button[type="submit"]:has-text("作成")');
  }

  async createRoom(name: string, password?: string) {
    await this.clickCreateRoom();
    await this.fillRoomName(name);
    if (password) {
      await this.fillPassword(password);
    }
    await this.submitCreateRoom();
    // Wait for navigation to room page
    await this.page.waitForURL(/\/(room|r)\//);
  }
}

/**
 * Room page object
 */
class RoomPage {
  constructor(private page: Page) {}

  async goto(roomId: string) {
    await this.page.goto(`/room/${roomId}`);
    await this.waitForConnection();
  }

  async gotoShortUrl(shortId: string) {
    await this.page.goto(`/r/${shortId}`);
    await this.waitForConnection();
  }

  async waitForConnection() {
    // Wait for SkyWay connection to establish
    // The room page should show member list when connected
    await this.page.waitForTimeout(3000);
  }

  async enterPassword(password: string) {
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("入室")');
  }

  // Video controls
  async openVideoSearch() {
    await this.page.click('button[title="AddVideo"]');
  }

  async searchVideo(query: string) {
    await this.page.fill('input[placeholder*="検索"]', query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000); // Wait for search results
  }

  async selectFirstVideo() {
    await this.page.click('.video-result:first-child, [data-testid="video-result"]:first-child');
  }

  async clickPlay() {
    await this.page.click('button[title="再生"], button:has-text("再生")');
  }

  async clickPause() {
    await this.page.click('button[title="一時停止"], button:has-text("一時停止")');
  }

  async seekTo(seconds: number) {
    // Find the seek bar and click at the appropriate position
    const seekBar = this.page.locator('input[type="range"]').first();
    await seekBar.click({ position: { x: seconds * 2, y: 5 } });
  }

  // Chat controls
  async sendChatMessage(message: string) {
    await this.page.fill('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]', message);
    await this.page.keyboard.press('Enter');
  }

  async getChatMessages() {
    const messages = await this.page.locator('.chat-message, [data-testid="chat-message"]').allTextContents();
    return messages;
  }

  async waitForChatMessage(text: string, timeout = 10000) {
    await this.page.waitForSelector(`.chat-message:has-text("${text}"), [data-testid="chat-message"]:has-text("${text}")`, { timeout });
  }

  // Reaction controls
  async openReactionPicker() {
    await this.page.click('button[title*="リアクション"], button:has-text("😀")');
  }

  async selectReaction(emoji: string) {
    await this.page.click(`button:has-text("${emoji}")`);
  }

  async sendReaction(emoji: string) {
    await this.openReactionPicker();
    await this.selectReaction(emoji);
  }

  async waitForReaction(emoji: string, timeout = 5000) {
    await this.page.waitForSelector(`.animate-float-down:has-text("${emoji}")`, { timeout });
  }

  // Member list
  async openMemberList() {
    await this.page.click('button[title="メンバー"]');
  }

  async getMemberNames() {
    const members = await this.page.locator('.member-name, [data-testid="member-name"]').allTextContents();
    return members;
  }

  async waitForMember(name: string, timeout = 10000) {
    await this.page.waitForSelector(`.member-name:has-text("${name}"), [data-testid="member-name"]:has-text("${name}")`, { timeout });
  }

  // Video player state
  async getVideoTitle() {
    const title = await this.page.locator('.video-title, [data-testid="video-title"]').textContent();
    return title;
  }

  async isVideoPlaying() {
    // Check if video is playing by looking at player state or button state
    const pauseButton = await this.page.locator('button[title="一時停止"]').isVisible();
    return pauseButton;
  }

  async getCurrentTime(): Promise<number> {
    // Try to get current time from UI or player
    const timeText = await this.page.locator('.current-time, [data-testid="current-time"]').textContent();
    if (timeText) {
      const [minutes, seconds] = timeText.split(':').map(Number);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  // Leave room
  async leaveRoom() {
    await this.page.click('button[title="部屋を出る"]');
  }
}

/**
 * Generate unique user ID
 */
function generateUserId(): string {
  return `e2e-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // Override default page to ensure cleanup navigates away first
  page: async ({ page }, use) => {
    await use(page);
    // Navigate away before context closes to trigger React unmount and sendBeacon
    try {
      await page.goto('about:blank', { timeout: 2000 });
      await page.waitForTimeout(100);
    } catch {
      // Ignore if page is already closed
    }
  },

  createUser: async ({ browser }, use) => {
    const sessions: UserSession[] = [];

    const createUser = async (name: string): Promise<UserSession> => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const userId = generateUserId();

      // Set user info in localStorage before navigating
      await context.addInitScript((data) => {
        localStorage.setItem('user-storage', JSON.stringify({
          state: {
            id: data.userId,
            name: data.userName,
            iconUrl: null,
          },
          version: 0,
        }));
      }, { userId, userName: name });

      sessions.push({ context, page, userId, userName: name });
      return { context, page, userId, userName: name };
    };

    await use(createUser);

    // Cleanup all sessions
    for (const session of sessions) {
      // Navigate away from room page to trigger React unmount and sendBeacon
      // This ensures member count is decremented before context closes
      try {
        await session.page.goto('about:blank', { timeout: 2000 });
        // Small delay to allow sendBeacon to be queued
        await session.page.waitForTimeout(100);
      } catch {
        // Ignore navigation errors (page might already be closed)
      }
      await session.context.close();
    }
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  roomPage: async ({ page }, use) => {
    await use(new RoomPage(page));
  },
});

export { expect };
export type { UserSession, HomePage, RoomPage };
