import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Privacy — ToolRelay' };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
        <h1>Privacy Policy</h1>
        <p>
          ToolRelay collects the minimum data needed to run the service: your email, the tool
          configurations you create, and usage logs (timestamp, status code, latency, error
          message). Stripe handles all payment data; we never see card numbers.
        </p>
        <h2>What we store</h2>
        <ul>
          <li><strong>Account:</strong> email, hashed password, account metadata.</li>
          <li><strong>Tools:</strong> name, slug, description, endpoint URL, optional auth header (encrypted at rest).</li>
          <li><strong>Usage:</strong> timestamp, status code, latency, and any error message returned by your endpoint.</li>
          <li><strong>Billing:</strong> Stripe customer/subscription IDs and plan status.</li>
        </ul>
        <h2>How we use it</h2>
        <p>To operate the proxy, enforce plan limits, and bill correctly. We do not sell or share
          your data with third parties beyond the providers listed below.</p>
        <h2>Subprocessors</h2>
        <ul>
          <li>Supabase (auth + database hosting)</li>
          <li>Stripe (payments)</li>
          <li>Vercel (hosting)</li>
        </ul>
        <h2>Your rights</h2>
        <p>You can delete your account and all associated tools and logs at any time by contacting
          support.</p>
      </main>
      <SiteFooter />
    </>
  );
}
