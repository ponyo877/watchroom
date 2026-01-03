import { generateId } from './utils';

export const STORAGE_KEYS = {
  USER_ID: 'user_id',
  USER_NAME: 'user_name',
  USER_ICON_URL: 'user_icon_url',
  THEME: 'theme',
  USER_STORAGE: 'user-storage',
  SEARCH_CACHE: 'youtube-search-cache',
} as const;

export interface UserData {
  id: string;
  name: string;
  iconUrl: string;
}

export function getUserId(): string {
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = generateId();
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
}

export function getUserName(): string {
  return localStorage.getItem(STORAGE_KEYS.USER_NAME) || `Guest_${getUserId().slice(0, 6)}`;
}

export function setUserName(name: string): void {
  localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
}

export function getUserIconUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.USER_ICON_URL) || '';
}

export function setUserIconUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.USER_ICON_URL, url);
}

export function getUserData(): UserData {
  return {
    id: getUserId(),
    name: getUserName(),
    iconUrl: getUserIconUrl(),
  };
}

export function getTheme(): 'light' | 'dark' | 'system' {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'system';
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function clearAllUserData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
