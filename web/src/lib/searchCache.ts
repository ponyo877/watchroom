import type { YouTubeVideo } from '@/types/youtube';

const CACHE_KEY = 'youtube-search-cache';
const CACHE_TTL = 30 * 60 * 1000; // 30分
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry {
  query: string;
  results: YouTubeVideo[];
  timestamp: number;
}

export const getFromCache = (query: string): YouTubeVideo[] | null => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;

    const cache: CacheEntry[] = JSON.parse(cacheStr);
    const normalizedQuery = query.toLowerCase();
    const entry = cache.find((e) => e.query === normalizedQuery);

    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.results;
    }

    // 期限切れのエントリを削除
    if (entry) {
      const filtered = cache.filter((e) => e.query !== normalizedQuery);
      localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    }

    return null;
  } catch {
    return null;
  }
};

export const saveToCache = (query: string, results: YouTubeVideo[]): void => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    let cache: CacheEntry[] = cacheStr ? JSON.parse(cacheStr) : [];
    const normalizedQuery = query.toLowerCase();

    // 既存のエントリを更新または追加
    const existingIndex = cache.findIndex((e) => e.query === normalizedQuery);
    const newEntry: CacheEntry = {
      query: normalizedQuery,
      results,
      timestamp: Date.now(),
    };

    if (existingIndex !== -1) {
      cache[existingIndex] = newEntry;
    } else {
      cache.unshift(newEntry);
    }

    // 期限切れのエントリを削除
    const now = Date.now();
    cache = cache.filter((e) => now - e.timestamp < CACHE_TTL);

    // 最大件数を超えたら古いものを削除
    if (cache.length > MAX_CACHE_ENTRIES) {
      cache = cache.slice(0, MAX_CACHE_ENTRIES);
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage error - ignore
  }
};

export const clearCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};
