import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { t, plural } from '@lingui/macro';
import { useLingui } from '@lingui/react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  // crypto.randomUUID is only available in secure contexts (HTTPS/localhost)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(date: Date, locale: string = 'ja'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return t`Just now`;
  if (diffMins < 60)
    return plural(diffMins, {
      one: '# minute ago',
      other: '# minutes ago',
    });
  if (diffHours < 24)
    return plural(diffHours, {
      one: '# hour ago',
      other: '# hours ago',
    });
  if (diffDays < 7)
    return plural(diffDays, {
      one: '# day ago',
      other: '# days ago',
    });
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP');
}

export function useRelativeTime() {
  const { i18n } = useLingui();
  return (date: Date) => formatRelativeTime(date, i18n.locale);
}
