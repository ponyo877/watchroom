import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useCallback, useEffect } from 'react';
import type { Locale } from './index';

// localStorage key for language persistence
const LANGUAGE_STORAGE_KEY = 'watchroom-language';

// Save language to localStorage
function saveLanguage(locale: Locale): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
}

export function useLanguage() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentLocale = useMemo<Locale>(() => {
    return location.pathname.startsWith('/en') ? 'en' : 'ja';
  }, [location.pathname]);

  // Save language to localStorage whenever it changes
  useEffect(() => {
    saveLanguage(currentLocale);
  }, [currentLocale]);

  // Language prefix for URL construction
  const languagePrefix = useMemo(() => {
    return currentLocale === 'en' ? '/en' : '';
  }, [currentLocale]);

  // Get home path with language prefix
  const getHomePath = useCallback((): string => {
    return currentLocale === 'en' ? '/en' : '/';
  }, [currentLocale]);

  // Get room path with language prefix
  const getRoomPath = useCallback(
    (shortId: string): string => {
      return `${languagePrefix}/r/${shortId}`;
    },
    [languagePrefix]
  );

  // Get localized path - adds language prefix to any path
  const getLocalizedPath = useCallback(
    (path: string): string => {
      // Remove any existing language prefix first
      let cleanPath = path;
      if (cleanPath.startsWith('/en')) {
        cleanPath = cleanPath.replace(/^\/en/, '') || '/';
      }

      // Add prefix based on current locale
      if (currentLocale === 'en') {
        return cleanPath === '/' ? '/en' : `/en${cleanPath}`;
      }
      return cleanPath;
    },
    [currentLocale]
  );

  // Navigate to home with language preservation
  const navigateHome = useCallback(() => {
    navigate(getHomePath());
  }, [navigate, getHomePath]);

  const getAlternatePath = useCallback(
    (targetLocale: Locale) => {
      const path = location.pathname;
      const search = location.search;

      if (targetLocale === 'en') {
        if (path.startsWith('/en')) {
          return path + search;
        }
        return `/en${path === '/' ? '' : path}${search}`;
      } else {
        if (path.startsWith('/en')) {
          const newPath = path.replace(/^\/en/, '') || '/';
          return newPath + search;
        }
        return path + search;
      }
    },
    [location.pathname, location.search]
  );

  const switchLanguage = useCallback(
    (targetLocale: Locale) => {
      saveLanguage(targetLocale);
      const newPath = getAlternatePath(targetLocale);
      navigate(newPath);
    },
    [getAlternatePath, navigate]
  );

  return {
    currentLocale,
    languagePrefix,
    getHomePath,
    getRoomPath,
    getLocalizedPath,
    navigateHome,
    getAlternatePath,
    switchLanguage,
  };
}
