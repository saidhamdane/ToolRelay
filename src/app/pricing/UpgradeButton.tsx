'use client';

import { useState } from 'react';

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={loading}
        className="btn-primary w-full"
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch('/api/stripe/checkout', { method: 'POST' });
          const data = await res.json();
          if (!res.ok || !data.url) {
            setError(data.error || 'Could not start checkout');
            setLoading(false);
            return;
          }
          window.location.href = data.url;
        }}
      >
        {loading ? 'Starting checkout…' : 'Upgrade to Pro'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
