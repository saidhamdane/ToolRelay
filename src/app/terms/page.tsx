import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Terms — ToolRelay' };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
        <h1>Terms of Service</h1>
        <p>
          These terms govern your use of ToolRelay. By creating an account you agree to these terms.
          ToolRelay is provided as-is during the public MVP. We do not guarantee uptime or accuracy
          of proxied APIs.
        </p>
        <h2>Your account</h2>
        <p>You are responsible for activity under your account, including the API endpoints you wrap
          and the auth credentials you provide. Do not use ToolRelay to proxy or expose data you are
          not authorized to share.</p>
        <h2>Plans and billing</h2>
        <p>The Free plan is rate-limited and supports public tools only. The Pro plan unlocks
          additional tools, runs, private tools, and custom auth headers. Subscriptions renew monthly
          and can be cancelled at any time. Charges are non-refundable.</p>
        <h2>Acceptable use</h2>
        <p>Do not use ToolRelay to attack third-party systems, bypass rate limits, or evade access
          controls. We may suspend accounts that violate these terms.</p>
        <h2>Liability</h2>
        <p>ToolRelay is provided without warranty. We are not liable for any damages arising from use
          of the service.</p>
        <h2>Changes</h2>
        <p>These terms may change as the product matures. Continued use after changes constitutes
          acceptance.</p>
      </main>
      <SiteFooter />
    </>
  );
}
