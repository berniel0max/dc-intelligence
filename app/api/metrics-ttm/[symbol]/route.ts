import { NextRequest, NextResponse } from 'next/server';
import {
  fetchRatiosTtm,
  fetchKeyMetricsTtm,
  ttmRatioTripleFromSources,
} from '@/src/lib/fmp';

/**
 * TTM ratios for the metrics bar (PEG, operating margin, ROE).
 * Split from /api/quotes so sector quote polls stay fast on Vercel (no 2×N FMP calls).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  const empty = () =>
    NextResponse.json({
      priceEarningsToGrowthRatio: null as number | null,
      operatingProfitMargin:      null as number | null,
      returnOnEquity:             null as number | null,
    });

  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_api_key_here') return empty();

  try {
    const [ratiosRow, kmRow] = await Promise.all([
      fetchRatiosTtm(sym),
      fetchKeyMetricsTtm(sym),
    ]);
    const triple = ttmRatioTripleFromSources(ratiosRow, kmRow);
    return NextResponse.json(triple, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return empty();
  }
}
