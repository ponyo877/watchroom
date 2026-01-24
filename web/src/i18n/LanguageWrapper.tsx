import { useEffect, useState, type ReactNode } from 'react';
import { I18nProvider } from '@lingui/react';
import { i18n, loadCatalog, type Locale } from './index';

interface LanguageWrapperProps {
  lang: Locale;
  children: ReactNode;
}

export function LanguageWrapper({ lang, children }: LanguageWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);  // Reset when language changes
    loadCatalog(lang).then(() => {
      setIsLoaded(true);
    });
  }, [lang]);

  if (!isLoaded) {
    return null;
  }

  // key={lang} forces I18nProvider to re-mount when language changes
  return (
    <I18nProvider i18n={i18n} key={lang}>
      {children}
    </I18nProvider>
  );
}
