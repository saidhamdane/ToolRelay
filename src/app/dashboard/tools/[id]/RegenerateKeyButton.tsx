'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiKeyReveal } from '@/components/ApiKeyReveal';

export function RegenerateKeyButton({ toolId, hasKey }: { toolId: string; hasKey: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function regenerate() {
    if (
      hasKey &&
      !confirm('Regenerate the API key? The previous key will stop working immediately.')
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tools/${toolId}/key`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.api_key) {
      setError(data.error || 'Could not generate key');
      setLoading(false);
      return;
    }
    setRevealedKey(data.api_key);
    setLoading(false);
    router.refresh();
  }

  if (revealedKey) {
    return (
      <div className="space-y-3">
        <ApiKeyReveal
          apiKey={revealedKey}
          title={hasKey ? 'New API key generated' : 'API key generated'}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRevealedKey(null)}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn-secondary" onClick={regenerate} disabled={loading}>
        {loading ? 'Generating…' : hasKey ? 'Regenerate key' : 'Generate API key'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
