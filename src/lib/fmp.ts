/**
 * Server-side FMP (Financial Modeling Prep) API client.
 * Uses the new /stable/ endpoints (v3 is legacy, blocked for accounts created after Aug 2025).
 * Never import this in client components — use the /api/* routes instead.
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function apiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key || key === 'your_api_key_here') throw new Error('FMP_API_KEY is not configured in .env.local');
  return key;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changePercentage: number;  // stable API uses changePercentage (not changesPercentage)
  change: number;
  dayLow: number;
  dayHigh: number;
  marketCap: number;
  volume: number;
  open: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  // pe / eps not included in stable /quote endpoint
}

export interface FMPPriceChange {
  symbol: string;
  '1D': number;
  '5D': number;
  '1M': number;
  '3M': number;
  '6M': number;
  ytd: number;
  '1Y': number;
  '3Y': number;
  '5Y': number;
}

export interface FMPBar {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Batch quote — price, daily %, market cap.
 * Tries /stable/batch-quote first (requires Professional plan).
 * Falls back to parallel individual /stable/quote calls (available on Starter plan).
 */
export async function fetchQuotes(symbols: string[]): Promise<FMPQuote[]> {
  // Attempt batch endpoint first
  const batchUrl = `${FMP_BASE}/batch-quote?symbols=${symbols.join(',')}&apikey=${apiKey()}`;
  const batchRes = await fetch(batchUrl, { cache: 'no-store' });
  if (batchRes.ok) {
    const data = await batchRes.json();
    return Array.isArray(data) ? data : [];
  }

  // Batch endpoint blocked (402) — fall back to individual quote calls in parallel
  const results = await Promise.allSettled(
    symbols.map(async sym => {
      const url = `${FMP_BASE}/quote?symbol=${sym}&apikey=${apiKey()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? (data[0] ?? null) : null;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<FMPQuote> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/**
 * Batch price change — YTD %, 1Y %, etc.
 * New stable endpoint: /stable/stock-price-change?symbol=AAPL,MSFT,...
 */
export async function fetchPriceChanges(symbols: string[]): Promise<FMPPriceChange[]> {
  const url = `${FMP_BASE}/stock-price-change?symbol=${symbols.join(',')}&apikey=${apiKey()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FMP /stable/stock-price-change error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Daily EOD history — for weekly, monthly, multi-year views.
 * New stable endpoint: /stable/historical-price-eod/full?symbol=AAPL&from=...&to=...
 */
export async function fetchDailyHistory(
  symbol: string,
  from: string,
  to: string,
): Promise<FMPBar[]> {
  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${symbol}&from=${from}&to=${to}&apikey=${apiKey()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FMP /stable/historical-price-eod error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Stable API returns a plain array; v3 used { historical: [...] } — handle both
  const arr: FMPBar[] = Array.isArray(data) ? data : (data?.historical ?? []);
  return [...arr].reverse(); // stable returns newest-first → flip to oldest-first
}

/**
 * Company profile — name, description, sector, industry.
 * Used to populate descriptions for manually added tickers.
 */
export async function fetchProfile(symbol: string): Promise<{ description: string; name: string } | null> {
  const url = `${FMP_BASE}/profile?symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return null;
  return {
    name:        item.companyName ?? item.name ?? symbol,
    description: item.description ?? '',
  };
}

/**
 * Intraday (30-min bars) — for 1D view.
 * New stable endpoint: /stable/historical-chart/30min?symbol=AAPL
 */
export async function fetchIntradayHistory(symbol: string): Promise<FMPBar[]> {
  const url = `${FMP_BASE}/historical-chart/30min?symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FMP /stable/historical-chart/30min error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const arr: FMPBar[] = Array.isArray(data) ? data : [];
  // FMP returns newest-first; keep only today's session and reverse to oldest-first
  const today = new Date().toISOString().split('T')[0];
  const todayBars = arr.filter(b => b.date.startsWith(today));
  return todayBars.length ? [...todayBars].reverse() : [...arr.slice(0, 14)].reverse();
}
