'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteToolButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn-danger"
      disabled={loading}
      onClick={async () => {
        if (!confirm('Delete this tool? Usage logs will be removed too.')) return;
        setLoading(true);
        const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Failed to delete');
          setLoading(false);
          return;
        }
        router.push('/dashboard');
        router.refresh();
      }}
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
