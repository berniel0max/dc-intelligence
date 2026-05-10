/**
 * Server-side FMP (Financial Modeling Prep) API client.
 *
 * Official stable API base (per https://site.financialmodelingprep.com/developer/docs/stable):
 *   `https://financialmodelingprep.com/stable/...`
 * Data calls return 403 on `site.financialmodelingprep.com` — use `financialmodelingprep.com` only.
 *
 * v3 `/api/v3/...` is legacy; many new accounts cannot use it — stay on `/stable/`.
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

/** Parse numeric fields from ratio endpoints (numbers or numeric strings). */
export function parseFiniteNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** First present finite number among raw endpoint fields (same key may differ by plan / schema). */
function firstNumber(...raw: unknown[]): number | null {
  for (const v of raw) {
    const n = parseFiniteNumber(v);
    if (n != null) return n;
  }
  return null;
}

/**
 * Trailing-twelve-month ratios — PEG, operating margin, ROE (metrics bar).
 * Endpoint: /stable/ratios-ttm?symbol=
 */
export async function fetchRatiosTtm(symbol: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${FMP_BASE}/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** ROE and related metrics — /stable/key-metrics-ttm (ROE not on ratios-ttm). */
export async function fetchKeyMetricsTtm(symbol: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${FMP_BASE}/key-metrics-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Map FMP stable TTM payloads → metrics bar fields.
 * Ratios use `*TTM` suffixes; ROE comes from key-metrics-ttm (`returnOnEquityTTM`).
 */
export function ttmRatioTripleFromSources(
  ratios: Record<string, unknown> | null | undefined,
  keyMetrics: Record<string, unknown> | null | undefined,
): {
  priceEarningsToGrowthRatio: number | null;
  operatingProfitMargin: number | null;
  returnOnEquity: number | null;
} {
  const peg = firstNumber(
    ratios?.priceToEarningsGrowthRatioTTM,
    ratios?.priceEarningsToGrowthRatioTTM,
    ratios?.priceEarningsToGrowthRatio,
    ratios?.priceEarningsGrowthRatio,
  );
  /** Operating margin: stable ratios-ttm uses operatingProfitMarginTTM; fall back to EBIT margin or snake_case. */
  const opm = firstNumber(
    ratios?.operatingProfitMarginTTM,
    ratios?.operatingProfitMargin,
    ratios?.operating_profit_margin_ttm,
    ratios?.ebitMarginTTM,
    ratios?.continuousOperationsProfitMarginTTM,
    ratios?.pretaxProfitMarginTTM,
  );
  /** ROE: on stable, ratios-ttm often omits ROE; key-metrics-ttm has returnOnEquityTTM. */
  const roe = firstNumber(
    keyMetrics?.returnOnEquityTTM,
    keyMetrics?.returnOnEquity,
    keyMetrics?.roeTTM,
    keyMetrics?.return_on_equity_ttm,
    ratios?.returnOnEquityTTM,
    ratios?.returnOnEquity,
    ratios?.return_on_equity_ttm,
  );
  return {
    priceEarningsToGrowthRatio: peg,
    operatingProfitMargin:      opm,
    returnOnEquity:             roe,
  };
}

export type TtmRatioTriple = ReturnType<typeof ttmRatioTripleFromSources>;

export function emptyTtmRatioTriple(): TtmRatioTriple {
  return {
    priceEarningsToGrowthRatio: null,
    operatingProfitMargin:      null,
    returnOnEquity:             null,
  };
}

/** Load PEG / operating margin / ROE from FMP (two TTM endpoints). Never throws; returns nulls on failure. */
export async function loadTtmRatioTriple(symbol: string): Promise<TtmRatioTriple> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return emptyTtmRatioTriple();
  try {
    const [ratiosRow, kmRow] = await Promise.all([
      fetchRatiosTtm(sym),
      fetchKeyMetricsTtm(sym),
    ]);
    return ttmRatioTripleFromSources(ratiosRow, kmRow);
  } catch {
    return emptyTtmRatioTriple();
  }
}

/**
 * Company profile — name, description, CEO, headcount.
 * Used to populate descriptions for manually added tickers and ticker detail header.
 */
function parseFullTimeEmployees(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  const n = parseInt(String(v).replace(/,/g, '').replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export interface FMPProfileBrief {
  name: string;
  description: string;
  ceo: string;
  fullTimeEmployees: number | null;
}

export async function fetchProfile(symbol: string): Promise<FMPProfileBrief | null> {
  const url = `${FMP_BASE}/profile?symbol=${symbol}&apikey=${apiKey()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return null;
  return {
    name:               item.companyName ?? item.name ?? symbol,
    description:        item.description ?? '',
    ceo:                String(item.ceo ?? '').trim(),
    fullTimeEmployees:  parseFullTimeEmployees(item.fullTimeEmployees),
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
