import { Link } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import { useLanguage } from '@/i18n/useLanguage';

export default function NotFoundPage() {
  const { currentLocale } = useLanguage();
  const homeLink = currentLocale === 'en' ? '/en' : '/';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          <Trans>Page not found</Trans>
        </p>
        <Link
          to={homeLink}
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          <Trans>Back to Home</Trans>
        </Link>
      </div>
    </div>
  );
}
