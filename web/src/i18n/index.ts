import { i18n } from '@lingui/core';

export type Locale = 'ja' | 'en';

export const locales: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
};

export const defaultLocale: Locale = 'ja';

export async function loadCatalog(locale: Locale) {
  const { messages } = await import(`../locales/${locale}/messages.ts`);
  i18n.loadAndActivate({ locale, messages });
}

export { i18n };
