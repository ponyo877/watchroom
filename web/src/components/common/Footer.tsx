import { ExternalLink } from 'lucide-react';
import { t, Trans } from '@lingui/macro';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/useLanguage';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  const { languagePrefix } = useLanguage();

  const externalLinks = [
    {
      href: 'https://www.youtube.com/t/terms',
      label: t`YouTube Terms of Service`,
    },
    {
      href: 'https://policies.google.com/privacy',
      label: t`Google Privacy Policy`,
    },
  ];

  const internalLinks = [
    {
      to: `${languagePrefix}/terms`,
      label: t`Terms of Service`,
    },
    {
      to: `${languagePrefix}/privacy`,
      label: t`Privacy Policy`,
    },
  ];

  return (
    <footer className={`border-t border-border bg-background/80 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Consent notice */}
          <p className="text-xs text-muted-foreground text-center">
            <Trans>
              By using this service, you agree to our Terms of Service and the YouTube Terms of Service.
            </Trans>
          </p>

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            {internalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {externalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
