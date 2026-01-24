import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import type { Locale } from './index';

export function useLanguage() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentLocale = useMemo<Locale>(() => {
    return location.pathname.startsWith('/en') ? 'en' : 'ja';
  }, [location.pathname]);

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
      const newPath = getAlternatePath(targetLocale);
      navigate(newPath);
    },
    [getAlternatePath, navigate]
  );

  return {
    currentLocale,
    getAlternatePath,
    switchLanguage,
  };
}
