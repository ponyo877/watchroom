import { t, Trans } from '@lingui/macro';
import { useLanguage } from '@/i18n/useLanguage';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Footer from '@/components/common/Footer';

export default function TermsPage() {
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
        <h1 className="font-semibold">{t`Terms of Service`}</h1>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            <Trans>Last updated: January 2025</Trans>
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`1. Acceptance of Terms`}</h2>
            <p>
              <Trans>
                By accessing or using WatchRoom ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`2. YouTube Terms of Service`}</h2>
            <p>
              <Trans>
                Our Service uses YouTube API Services. By using our Service, you agree to be bound by the YouTube Terms of Service.
              </Trans>
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">
                <Trans>Important:</Trans>
              </p>
              <p>
                <Trans>
                  By using this Service, you agree to the YouTube Terms of Service available at:
                </Trans>
              </p>
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
              >
                https://www.youtube.com/t/terms
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`3. Description of Service`}</h2>
            <p>
              <Trans>
                WatchRoom is a service that allows users to watch YouTube videos together in real-time.
                Features include:
              </Trans>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><Trans>Synchronized video playback across multiple users</Trans></li>
              <li><Trans>Real-time chat within watch rooms</Trans></li>
              <li><Trans>Emoji reactions during video playback</Trans></li>
              <li><Trans>Room creation and management</Trans></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`4. User Responsibilities`}</h2>
            <p className="mb-4">
              <Trans>When using the Service, you agree to:</Trans>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><Trans>Use the Service only for lawful purposes</Trans></li>
              <li><Trans>Not engage in any activity that disrupts or interferes with the Service</Trans></li>
              <li><Trans>Not use the Service to harass, abuse, or harm others</Trans></li>
              <li><Trans>Not share inappropriate, offensive, or illegal content in chat rooms</Trans></li>
              <li><Trans>Respect the intellectual property rights of content creators</Trans></li>
              <li><Trans>Comply with all applicable laws and regulations</Trans></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`5. Content`}</h2>
            <p>
              <Trans>
                All video content is provided by YouTube and is subject to YouTube's Terms of Service and Community Guidelines.
                We do not host, store, or control video content.
              </Trans>
            </p>
            <p className="mt-4">
              <Trans>
                You are responsible for any content you share in chat rooms, including messages and reactions.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`6. Privacy`}</h2>
            <p>
              <Trans>
                Your use of the Service is also governed by our Privacy Policy.
                Please review our Privacy Policy to understand how we collect and use your information.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`7. Disclaimer of Warranties`}</h2>
            <p>
              <Trans>
                The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied.
                We do not guarantee that the Service will be uninterrupted, secure, or error-free.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`8. Limitation of Liability`}</h2>
            <p>
              <Trans>
                To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`9. Modifications to Terms`}</h2>
            <p>
              <Trans>
                We reserve the right to modify these Terms of Service at any time.
                Changes will be effective immediately upon posting.
                Your continued use of the Service after any changes constitutes acceptance of the new terms.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`10. Termination`}</h2>
            <p>
              <Trans>
                We reserve the right to terminate or suspend access to the Service at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </Trans>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t`11. Contact`}</h2>
            <p>
              <Trans>
                If you have any questions about these Terms of Service, please contact us at:
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
