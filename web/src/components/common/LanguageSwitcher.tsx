import { useLanguage } from '@/i18n/useLanguage';
import { Link } from 'react-router-dom';

export default function LanguageSwitcher() {
  const { currentLocale, getAlternatePath } = useLanguage();

  return (
    <div className="flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-sm">
      <Link
        to={getAlternatePath('ja')}
        className={`transition-colors duration-200 ${
          currentLocale === 'ja'
            ? 'font-bold text-blue-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-label="日本語に切り替え"
      >
        JA
      </Link>
      <span className="text-gray-300 mx-1.5">|</span>
      <Link
        to={getAlternatePath('en')}
        className={`transition-colors duration-200 ${
          currentLocale === 'en'
            ? 'font-bold text-blue-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-label="Switch to English"
      >
        EN
      </Link>
    </div>
  );
}
