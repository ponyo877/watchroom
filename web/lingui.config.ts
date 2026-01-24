import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['ja', 'en'],
  sourceLocale: 'ja',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: 'po',
  compileNamespace: 'ts',
};

export default config;
