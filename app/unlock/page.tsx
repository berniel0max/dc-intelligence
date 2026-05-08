'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UnlockPage() {
  const router = useRouter();
  const [lockEnabled, setLockEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/edit-unlock')
      .then(r => r.json())
      .then((d: { lockEnabled?: boolean }) => setLockEnabled(Boolean(d.lockEnabled)))
      .catch(() => setLockEnabled(true));
  }, []);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/edit-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? (res.status === 401 ? 'Invalid secret' : 'Request failed'));
        setLoading(false);
        return;
      }
      setSecret('');
      router.push('/');
      router.refresh();
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function onLock() {
    setError('');
    await fetch('/api/edit-lock', { method: 'POST' });
    router.refresh();
  }

  if (lockEnabled === false) {
    return (
      <main className="min-h-screen px-6 py-16 flex flex-col items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold text-white tracking-tight">Edit access</h1>
          <p className="text-sm" style={{ color: '#888' }}>
            Edit lock is off (no <code className="text-[13px]" style={{ color: '#aaa' }}>EDIT_ACCESS_SECRET</code> in
            server env). Layout and ticker edits are available to everyone until you set that variable and redeploy.
          </p>
          <Link href="/" className="inline-block text-sm" style={{ color: '#b1ff56' }}>
            ← Back to app
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-16 flex flex-col items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Edit access</h1>
          <p className="text-sm mt-2" style={{ color: '#666' }}>
            Enter the owner secret to enable layout and ticker edits in this browser. Requires{' '}
            <code className="text-[13px]" style={{ color: '#888' }}>EDIT_ACCESS_SECRET</code> on
            the server (e.g. Vercel).
          </p>
        </div>

        <form onSubmit={onUnlock} className="space-y-3">
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Secret"
            className="w-full rounded border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/25"
          />
          {error ? (
            <p className="text-sm" style={{ color: '#ff4436' }}>{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full rounded py-2 text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: '#b1ff56', color: '#0a0a0a' }}
          >
            {loading ? 'Checking…' : 'Unlock edits'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={onLock}
            className="w-full rounded py-2 text-sm border border-white/15 text-white/80 hover:bg-white/5"
          >
            Lock edits (this browser)
          </button>
          <Link href="/" className="block text-center text-sm" style={{ color: '#666' }}>
            ← Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
