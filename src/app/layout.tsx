import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ToolRelay — Turn any API into an AI-agent-ready paid tool',
  description:
    'ToolRelay lets SaaS owners turn any API endpoint into an AI-agent-ready tool with a public tool page, proxy endpoint, usage tracking, and Stripe billing — in minutes.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-white">{children}</body>
    </html>
  );
}
