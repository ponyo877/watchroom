import { t, Trans } from '@lingui/macro';
import { useLanguage } from '@/i18n/useLanguage';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Footer from '@/components/common/Footer';

export default function PrivacyPage() {
  const { navigateHome } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center px-4">
        <button
          onClick={() => navigateHome()}
          className="p-2 hover:bg-accent rounded-md mr-2"
          title={t`Back to Home`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold">{t`Privacy Policy`}</h1>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            <Trans>Last updated: January 2025</Trans>
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`1. Introduction`}</h2>
            <p>
              <Trans>
                WatchRoom ("we", "our", or "the Service") is a video watching service that allows users to watch YouTube videos together in real-time.
                This Privacy Policy explains how we collect, use, and protect your information when you use our Service.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`2. YouTube API Services`}</h2>
            <p>
              <Trans>
                Our Service uses YouTube API Services to provide video playback functionality.
                By using our Service, you are also agreeing to be bound by the YouTube Terms of Service and Google Privacy Policy.
              </Trans>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t`YouTube Terms of Service`}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t`Google Privacy Policy`}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`3. Information We Collect`}</h2>
            <p className="mb-4">
              <Trans>We collect the following information to provide and improve our Service:</Trans>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t`User ID`}</strong>: <Trans>A randomly generated identifier assigned to your browser. This ID is used to identify you within rooms and is not linked to any personal information.</Trans>
              </li>
              <li>
                <strong>{t`Display Name`}</strong>: <Trans>The name you choose to display to other users in the room. This is optional and can be changed at any time.</Trans>
              </li>
              <li>
                <strong>{t`Profile Image`}</strong>: <Trans>The avatar image you select. This is stored locally on your device.</Trans>
              </li>
              <li>
                <strong>{t`Theme Preference`}</strong>: <Trans>Your preferred color scheme (light/dark mode).</Trans>
              </li>
              <li>
                <strong>{t`Video Search Cache`}</strong>: <Trans>Recent video search queries are cached locally to improve your experience.</Trans>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`4. How We Use Your Information`}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><Trans>To provide and maintain the Service</Trans></li>
              <li><Trans>To identify you within watch rooms</Trans></li>
              <li><Trans>To display your chosen name and avatar to other room members</Trans></li>
              <li><Trans>To remember your preferences across sessions</Trans></li>
              <li><Trans>To synchronize video playback with other users in the same room</Trans></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`5. Information Sharing`}</h2>
            <p>
              <Trans>
                When you join a watch room, the following information is shared with other members in the same room:
              </Trans>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><Trans>Your display name</Trans></li>
              <li><Trans>Your profile image</Trans></li>
              <li><Trans>Your chat messages within the room</Trans></li>
              <li><Trans>Your reactions to videos</Trans></li>
            </ul>
            <p className="mt-4">
              <Trans>
                We do not sell, trade, or otherwise transfer your information to third parties outside of what is necessary to provide the Service.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`6. Local Storage`}</h2>
            <p>
              <Trans>
                Our Service uses browser localStorage to store your preferences and user data locally on your device.
                This includes:
              </Trans>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><Trans>Your user ID</Trans></li>
              <li><Trans>Your display name and profile image</Trans></li>
              <li><Trans>Your theme preference</Trans></li>
              <li><Trans>Video search cache</Trans></li>
            </ul>
            <p className="mt-4">
              <Trans>
                You can clear this data at any time by clearing your browser's local storage or using your browser's privacy settings.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`7. Data Security`}</h2>
            <p>
              <Trans>
                We implement appropriate security measures to protect your information.
                However, no method of transmission over the Internet is 100% secure.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`8. Changes to This Policy`}</h2>
            <p>
              <Trans>
                We may update this Privacy Policy from time to time.
                We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`9. Contact Us`}</h2>
            <p>
              <Trans>
                If you have any questions about this Privacy Policy, please contact us at:
              </Trans>
            </p>
            <p className="mt-2">
              <a
                href="mailto:877ponyo@gmail.com"
                className="text-primary hover:underline"
              >
                877ponyo@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
