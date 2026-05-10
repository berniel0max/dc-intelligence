import { NextRequest, NextResponse } from 'next/server';
import { emptyTtmRatioTriple, loadTtmRatioTriple } from '@/src/lib/fmp';

/**
 * TTM metrics via query string (avoids dynamic path issues for symbols with `.`, etc.).
 * GET /api/metrics-ttm?symbol=AAPL
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim();

  const empty = () =>
    NextResponse.json(emptyTtmRatioTriple(), {
      headers: { 'Cache-Control': 'no-store' },
    });

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol query param required' },
      { status: 400 },
    );
  }

  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_api_key_here') return empty();

  try {
    const triple = await loadTtmRatioTriple(symbol);
    return NextResponse.json(triple, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return empty();
  }
}
