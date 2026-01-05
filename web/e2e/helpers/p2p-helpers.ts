import { Page } from '@playwright/test';

/**
 * Test state exposed via window.__WATCHROOM_TEST__
 */
interface WatchRoomTestState {
  p2p: {
    isConnected: boolean;
    isDataStreamReady: boolean;
    memberCount: number;
  };
  sync: {
    isPlayerReady: boolean;
    hasInitialSync: boolean;
    currentVideoId: string | null;
  };
}

/**
 * Wait for P2P connection to be ready (connected + datastream ready)
 */
export async function waitForP2PReady(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 15000 } = options;
  await page.waitForFunction(
    () => {
      const test = (window as unknown as { __WATCHROOM_TEST__?: WatchRoomTestState }).__WATCHROOM_TEST__;
      if (!test) return false;
      return test.p2p.isConnected && test.p2p.isDataStreamReady;
    },
    { timeout }
  );
}

/**
 * Wait for member count to reach expected value
 */
export async function waitForMemberCount(
  page: Page,
  count: number,
  timeout = 20000
): Promise<void> {
  await page.waitForFunction(
    (expected: number) => {
      const test = (window as unknown as { __WATCHROOM_TEST__?: WatchRoomTestState }).__WATCHROOM_TEST__;
      return test?.p2p.memberCount >= expected;
    },
    count,
    { timeout }
  );
}

/**
 * Wait for video sync to complete (player ready + initial sync done)
 */
export async function waitForVideoSync(
  page: Page,
  options: { timeout?: number; videoId?: string } = {}
): Promise<void> {
  const { timeout = 25000, videoId } = options;
  await page.waitForFunction(
    ({ videoId }: { videoId?: string }) => {
      const test = (window as unknown as { __WATCHROOM_TEST__?: WatchRoomTestState }).__WATCHROOM_TEST__;
      if (!test) return false;
      const { sync } = test;
      if (!sync.isPlayerReady || !sync.hasInitialSync) return false;
      if (videoId && sync.currentVideoId !== videoId) return false;
      return true;
    },
    { videoId },
    { timeout }
  );
}

/**
 * Wait for player to be ready with a video loaded
 */
export async function waitForPlayerReady(
  page: Page,
  timeout = 20000
): Promise<void> {
  // First wait for YouTube iframe
  await page.waitForSelector('iframe[src*="youtube"]', { timeout });

  // Then wait for test state to indicate player is ready
  await page.waitForFunction(
    () => {
      const test = (window as unknown as { __WATCHROOM_TEST__?: WatchRoomTestState }).__WATCHROOM_TEST__;
      return test?.sync.isPlayerReady && test?.sync.currentVideoId;
    },
    { timeout }
  );
}

/**
 * Wait for video to be synced across multiple pages
 */
export async function waitForVideoOnAllPages(
  pages: Page[],
  options: { timeout?: number; videoId?: string } = {}
): Promise<void> {
  const { timeout = 30000, videoId } = options;
  await Promise.all(
    pages.map(page => waitForVideoSync(page, { timeout, videoId }))
  );
}

/**
 * Get the current test state from a page
 */
export async function getTestState(page: Page): Promise<WatchRoomTestState | null> {
  return await page.evaluate(() => {
    return (window as unknown as { __WATCHROOM_TEST__?: WatchRoomTestState }).__WATCHROOM_TEST__ ?? null;
  });
}

/**
 * Wait for P2P connection and DataStream to be ready on all pages
 */
export async function waitForP2PReadyOnAllPages(
  pages: Page[],
  options: { timeout?: number } = {}
): Promise<void> {
  await Promise.all(
    pages.map(page => waitForP2PReady(page, options))
  );
}
