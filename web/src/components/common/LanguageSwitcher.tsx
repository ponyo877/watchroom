import { useLanguage } from '@/i18n/useLanguage';
import { Link } from 'react-router-dom';

export default function LanguageSwitcher() {
  const { currentLocale, getAlternatePath } = useLanguage();

  return (
    <div className="flex items-center px-2 py-1.5 rounded-lg text-sm">
      <Link
        to={getAlternatePath('ja')}
        className={`transition-colors duration-200 ${
          currentLocale === 'ja'
            ? 'font-bold text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="日本語に切り替え"
      >
        JA
      </Link>
      <span className="text-muted-foreground/50 mx-1">|</span>
      <Link
        to={getAlternatePath('en')}
        className={`transition-colors duration-200 ${
          currentLocale === 'en'
            ? 'font-bold text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Switch to English"
      >
        EN
      </Link>
    </div>
  );
}
