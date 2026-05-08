import { NextRequest, NextResponse } from 'next/server';
import { fetchDailyHistory } from '@/src/lib/fmp';

/**
 * GET /api/sparklines?symbols=AAPL,MSFT,...
 * Returns last 10 EOD closing prices for each symbol (enough for a 7-trading-day sparkline).
 * All FMP calls run in parallel server-side, so the client makes just one request.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('symbols') ?? '';
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (!symbols.length) {
    return NextResponse.json({}, { status: 400 });
  }

  // Pull last 14 calendar days (guarantees ≥ 7 trading days in any timezone)
  const to   = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 14);
  const toStr   = to.toISOString().split('T')[0];
  const fromStr = from.toISOString().split('T')[0];

  const results = await Promise.allSettled(
    symbols.map(sym => fetchDailyHistory(sym, fromStr, toStr)),
  );

  const payload: Record<string, number[]> = {};
  results.forEach((r, i) => {
    const sym = symbols[i];
    if (r.status === 'fulfilled' && r.value.length) {
      // Keep only the last 10 data points and return closing prices
      const bars = r.value.slice(-10);
      payload[sym] = bars.map(b => b.close);
    } else {
      payload[sym] = [];
    }
  });

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
