'use client';

import { useEffect, useState } from 'react';

/**
 * Single lightweight probe so production shows a clear hint when FMP is not wired
 * (e.g. missing FMP_API_KEY on Vercel) and /api/quotes falls back to static tickerData.
 */
export default function DataSourceNotice() {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/quotes?symbols=AAPL', { cache: 'no-store' })
      .then(res => {
        setSource(res.headers.get('X-Data-Source') ?? (res.ok ? 'fmp-live' : 'error'));
      })
      .catch(() => setSource('error'));
  }, []);

  if (source !== 'mock-fallback') return null;

  return (
    <div
      className="mb-6 px-4 py-3 rounded text-[12px] leading-relaxed"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        color: '#e7e5e4',
      }}
    >
      <span style={{ color: '#fbbf24', fontWeight: 600 }}>Demo data mode.</span>{' '}
      Prices and some metrics are static placeholders, not live quotes. To use Financial Modeling Prep
      on your deployment, add{' '}
      <code className="text-[11px] px-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
        FMP_API_KEY
      </code>{' '}
      under{' '}
      <strong>Vercel → Project → Settings → Environment Variables</strong>, then redeploy (or trigger a new
      production deployment).
    </div>
  );
}
