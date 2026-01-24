import { ExternalLink } from 'lucide-react';
import { t } from '@lingui/macro';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  const links = [
    {
      href: 'https://www.youtube.com/t/terms',
      label: t`YouTube Terms of Service`,
    },
    {
      href: 'https://policies.google.com/privacy',
      label: t`Google Privacy Policy`,
    },
  ];

  return (
    <footer className={`border-t border-border bg-background/80 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          {links.map((link) => (
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
    </footer>
  );
}
