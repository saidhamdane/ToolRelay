'use client';

import { useState } from 'react';
import { CopyButton } from './CopyButton';

export function ApiKeyReveal({
  apiKey,
  title = 'Save this API key',
  description = "We'll only show it once. Store it in your secrets manager now — you can regenerate it later, but you can't view it again.",
}: {
  apiKey: string;
  title?: string;
  description?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-semibold text-amber-900">{title}</h3>
      <p className="mt-1 text-sm text-amber-800">{description}</p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={apiKey}
          type={revealed ? 'text' : 'password'}
          className="input font-mono text-xs flex-1"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <CopyButton value={apiKey} />
      </div>
      <p className="help mt-2">
        Send it on every call as <code className="font-mono">x-toolrelay-key: {revealed ? apiKey : '••••••'}</code>
      </p>
    </div>
  );
}
