'use client';

import { useState } from 'react';

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={loading}
        className="btn-primary w-full"
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch('/api/stripe/checkout', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) {
              setError(data.message || data.error || 'Could not start checkout');
              setLoading(false);
              return;
            }
            window.location.href = data.url;
          } catch (e: any) {
            setError(e?.message ?? 'Network error starting checkout');
            setLoading(false);
          }
        }}
      >
        {loading ? 'Starting checkout…' : 'Upgrade to Pro'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
