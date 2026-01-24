import type { Plugin } from 'vite';

interface I18nHtmlOptions {
  locales: {
    code: string;
    lang: string;
    ogLocale: string;
    title: string;
    description: string;
    loadingText: string;
  }[];
  defaultLocale: string;
}

const defaultOptions: I18nHtmlOptions = {
  locales: [
    {
      code: 'ja',
      lang: 'ja',
      ogLocale: 'ja_JP',
      title: 'WatchRoom - YouTube同時視聴',
      description: '友達と一緒にYouTube動画を同時視聴できるサービス',
      loadingText: '読み込み中...',
    },
    {
      code: 'en',
      lang: 'en',
      ogLocale: 'en_US',
      title: 'WatchRoom - Watch YouTube Together',
      description: 'Watch YouTube videos together with friends in real-time',
      loadingText: 'Loading...',
    },
  ],
  defaultLocale: 'ja',
};

export function i18nHtmlPlugin(options: Partial<I18nHtmlOptions> = {}): Plugin {
  const config = { ...defaultOptions, ...options };

  return {
    name: 'vite-plugin-i18n-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const indexHtml = bundle['index.html'];

      if (indexHtml?.type !== 'asset' || typeof indexHtml.source !== 'string') {
        return;
      }

      const originalHtml = indexHtml.source;
      const defaultLocale = config.locales.find((l) => l.code === config.defaultLocale);

      if (!defaultLocale) {
        return;
      }

      // Generate HTML for each non-default locale
      for (const locale of config.locales) {
        if (locale.code === config.defaultLocale) {
          continue;
        }

        let localizedHtml = originalHtml;

        // Replace lang attribute
        localizedHtml = localizedHtml.replace(
          `lang="${defaultLocale.lang}"`,
          `lang="${locale.lang}"`
        );

        // Replace og:locale
        localizedHtml = localizedHtml.replace(
          `og:locale" content="${defaultLocale.ogLocale}"`,
          `og:locale" content="${locale.ogLocale}"`
        );

        // Replace title (in <title> tag, og:title, twitter:title)
        localizedHtml = localizedHtml.replaceAll(defaultLocale.title, locale.title);

        // Replace description (og:description, twitter:description)
        localizedHtml = localizedHtml.replaceAll(defaultLocale.description, locale.description);

        // Replace loading text
        localizedHtml = localizedHtml.replace(defaultLocale.loadingText, locale.loadingText);

        // Add canonical and hreflang tags
        const baseUrl = 'https://watchroom.ponyo877.com';
        const hreflangTags = config.locales
          .map((l) => {
            const href = l.code === config.defaultLocale ? baseUrl + '/' : `${baseUrl}/${l.code}/`;
            return `    <link rel="alternate" hreflang="${l.code}" href="${href}" />`;
          })
          .join('\n');
        const xDefaultTag = `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/" />`;
        const canonicalTag = `    <link rel="canonical" href="${baseUrl}/${locale.code}/" />`;

        // Insert hreflang tags before </head>
        localizedHtml = localizedHtml.replace(
          '</head>',
          `${hreflangTags}\n${xDefaultTag}\n${canonicalTag}\n  </head>`
        );

        // Emit the localized HTML file
        this.emitFile({
          type: 'asset',
          fileName: `${locale.code}/index.html`,
          source: localizedHtml,
        });
      }

      // Add hreflang tags to default locale HTML
      const baseUrl = 'https://watchroom.ponyo877.com';
      const hreflangTags = config.locales
        .map((l) => {
          const href = l.code === config.defaultLocale ? baseUrl + '/' : `${baseUrl}/${l.code}/`;
          return `    <link rel="alternate" hreflang="${l.code}" href="${href}" />`;
        })
        .join('\n');
      const xDefaultTag = `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/" />`;
      const canonicalTag = `    <link rel="canonical" href="${baseUrl}/" />`;

      indexHtml.source = originalHtml.replace(
        '</head>',
        `${hreflangTags}\n${xDefaultTag}\n${canonicalTag}\n  </head>`
      );
    },
  };
}
