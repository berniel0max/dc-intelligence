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
  /** Split-adjusted close when FMP provides it — preferred for return %. */
  adjClose?: number;
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickNumRow(row: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const n = parseFiniteNumber(row[k]);
    if (n != null) return n;
  }
  return null;
}

function numFromRow(row: Record<string, unknown>, keys: string[], fallback = 0): number {
  return pickNumRow(row, keys) ?? fallback;
}

/** Normalize one FMP stock-price-change row (handles alternate key casing). */
function normalizePriceChangeRow(raw: unknown): FMPPriceChange | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const symbol = String(row.symbol ?? row.ticker ?? '').trim().toUpperCase();
  if (!symbol) return null;
  return {
    symbol,
    '1D': numFromRow(row, ['1D', '1d']),
    '5D': numFromRow(row, ['5D', '5d']),
    '1M': numFromRow(row, ['1M', '1m']),
    '3M': numFromRow(row, ['3M', '3m']),
    '6M': numFromRow(row, ['6M', '6m']),
    ytd:  numFromRow(row, ['ytd', 'YTD', 'yearToDate', 'year_to_date']),
    '1Y': numFromRow(row, ['1Y', '1y', '12M', '12m']),
    '3Y': numFromRow(row, ['3Y', '3y']),
    '5Y': numFromRow(row, ['5Y', '5y']),
  };
}

function parsePriceChangePayload(data: unknown): FMPPriceChange[] {
  if (!Array.isArray(data)) return [];
  const out: FMPPriceChange[] = [];
  for (const el of data) {
    const row = normalizePriceChangeRow(el);
    if (row) out.push(row);
  }
  return out;
}

const PRICE_CHG_CHUNK = 10;
const PRICE_CHG_PAUSE_MS = 160;

async function fetchPriceChangesChunk(chunk: string[]): Promise<FMPPriceChange[]> {
  const q = chunk.map(s => encodeURIComponent(s)).join(',');
  const url = `${FMP_BASE}/stock-price-change?symbol=${q}&apikey=${apiKey()}`;
  let res = await fetch(url, { cache: 'no-store' });
  if (res.status === 429 || res.status === 503) {
    await sleep(450);
    res = await fetch(url, { cache: 'no-store' });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FMP /stable/stock-price-change error ${res.status}: ${body.slice(0, 400)}`);
  }
  const data: unknown = await res.json();
  if (data && typeof data === 'object' && !Array.isArray(data) && 'Error Message' in data) {
    throw new Error(String((data as Record<string, unknown>)['Error Message']));
  }
  return parsePriceChangePayload(data);
}

/**
 * YTD % and ~1-year % from split-adjusted EOD when stock-price-change is missing or rate-limited.
 * Aligns with chart date ranges (calendar YTD + ~365d window).
 */
export async function fetchYtdOneYearPctFromEod(
  symbol: string,
): Promise<{ ytd: number | null; oneY: number | null }> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return { ytd: null, oneY: null };

  const px = (b: FMPBar): number => {
    if (typeof b.adjClose === 'number' && Number.isFinite(b.adjClose) && b.adjClose > 0) return b.adjClose;
    return b.close;
  };

  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  const iso = (d: Date) => d.toISOString().split('T')[0];

  try {
    const bars = await fetchDailyHistory(sym, iso(from), iso(to));
    if (bars.length < 2) return { ytd: null, oneY: null };

    const last = px(bars[bars.length - 1]);
    const first1y = px(bars[0]);
    if (!Number.isFinite(last) || !Number.isFinite(first1y) || first1y <= 0)
      return { ytd: null, oneY: null };

    const oneY = ((last - first1y) / first1y) * 100;

    const y = to.getFullYear();
    const ytdStart = `${y}-01-01`;
    const ytdBars = bars.filter(b => b.date >= ytdStart);
    let ytd: number | null = null;
    if (ytdBars.length >= 1) {
      const y0 = px(ytdBars[0]);
      if (Number.isFinite(y0) && y0 > 0) ytd = ((last - y0) / y0) * 100;
    }
    return { ytd, oneY };
  } catch {
    return { ytd: null, oneY: null };
  }
}

/** EOD fallback in small parallel batches (faster than fully serial; paced to limit 429s). */
export async function fetchEodYtdOneYearBatch(
  symbols: string[],
): Promise<Map<string, { ytd: number | null; oneY: number | null }>> {
  const m = new Map<string, { ytd: number | null; oneY: number | null }>();
  const uniq = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))];
  const BATCH = 4;
  for (let i = 0; i < uniq.length; i += BATCH) {
    const slice = uniq.slice(i, i + BATCH);
    const rows = await Promise.all(slice.map(s => fetchYtdOneYearPctFromEod(s)));
    slice.forEach((s, j) => m.set(s, rows[j]));
    if (i + BATCH < uniq.length) await sleep(200);
  }
  return m;
}

/**
 * Batch price change — YTD %, 1Y %, etc.
 * Chunked + paced to reduce 429s; failed chunks leave symbols to be filled via EOD fallback.
 */
export async function fetchPriceChanges(symbols: string[]): Promise<FMPPriceChange[]> {
  const uniq = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))];
  if (!uniq.length) return [];

  const merged: FMPPriceChange[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < uniq.length; i += PRICE_CHG_CHUNK) {
    const chunk = uniq.slice(i, i + PRICE_CHG_CHUNK);
    try {
      const rows = await fetchPriceChangesChunk(chunk);
      for (const r of rows) {
        const u = r.symbol.toUpperCase();
        if (!seen.has(u)) {
          seen.add(u);
          merged.push({ ...r, symbol: u });
        }
      }
    } catch {
      /* symbols in chunk missing until EOD fallback */
    }
    if (i + PRICE_CHG_CHUNK < uniq.length && PRICE_CHG_PAUSE_MS > 0) await sleep(PRICE_CHG_PAUSE_MS);
  }

  return merged;
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

export type TtmRatioTriple = {
  priceEarningsToGrowthRatio: number | null;
  operatingProfitMargin: number | null;
  returnOnEquity: number | null;
};

export type TtmQuoteBundle = TtmRatioTriple & {
  forwardPE: number | null;
  ttmPE: number | null;
  /** Raw USD (FMP); divide by 1e9 for `TickerData.netDebtValue` (billions). */
  netDebtUsd: number | null;
};

export function emptyTtmQuoteBundle(): TtmQuoteBundle {
  return {
    priceEarningsToGrowthRatio: null,
    operatingProfitMargin:      null,
    returnOnEquity:             null,
    forwardPE:                  null,
    ttmPE:                      null,
    netDebtUsd:                 null,
  };
}

export function emptyTtmRatioTriple(): TtmRatioTriple {
  const e = emptyTtmQuoteBundle();
  return {
    priceEarningsToGrowthRatio: e.priceEarningsToGrowthRatio,
    operatingProfitMargin:      e.operatingProfitMargin,
    returnOnEquity:             e.returnOnEquity,
  };
}

/**
 * Map FMP stable TTM payloads → metrics bar fields + valuation (Fwd/TTM P/E, net debt).
 * Ratios use `*TTM` suffixes; ROE often comes from key-metrics-ttm (`returnOnEquityTTM`).
 */
export function ttmQuoteBundleFromSources(
  ratios: Record<string, unknown> | null | undefined,
  keyMetrics: Record<string, unknown> | null | undefined,
): TtmQuoteBundle {
  const peg = firstNumber(
    ratios?.priceToEarningsGrowthRatioTTM,
    ratios?.priceEarningsToGrowthRatioTTM,
    ratios?.priceEarningsToGrowthRatio,
    ratios?.priceEarningsGrowthRatio,
  );
  const opm = firstNumber(
    ratios?.operatingProfitMarginTTM,
    ratios?.operatingProfitMargin,
    ratios?.operating_profit_margin_ttm,
    ratios?.ebitMarginTTM,
    ratios?.continuousOperationsProfitMarginTTM,
    ratios?.pretaxProfitMarginTTM,
  );
  const roe = firstNumber(
    keyMetrics?.returnOnEquityTTM,
    keyMetrics?.returnOnEquity,
    keyMetrics?.roeTTM,
    keyMetrics?.return_on_equity_ttm,
    ratios?.returnOnEquityTTM,
    ratios?.returnOnEquity,
    ratios?.return_on_equity_ttm,
  );

  const ttmPE = firstNumber(
    keyMetrics?.peRatioTTM,
    keyMetrics?.priceEarningsRatioTTM,
    keyMetrics?.peRatio,
    ratios?.priceEarningsRatioTTM,
    ratios?.priceToEarningsRatioTTM,
    ratios?.peRatioTTM,
    ratios?.peRatio,
  );

  const forwardPE = firstNumber(
    ratios?.forwardPriceToEarningsRatioTTM,
    ratios?.forwardPriceToEarningsTTM,
    ratios?.forwardPE,
    keyMetrics?.forwardPeRatioTTM,
    keyMetrics?.forwardPeTTM,
    keyMetrics?.forwardPE,
  );

  const netDebtUsd = firstNumber(
    keyMetrics?.netDebtTTM,
    keyMetrics?.netDebt,
    ratios?.netDebtTTM,
    ratios?.netDebt,
  );

  return {
    priceEarningsToGrowthRatio: peg,
    operatingProfitMargin:      opm,
    returnOnEquity:             roe,
    forwardPE,
    ttmPE,
    netDebtUsd,
  };
}

/** Full TTM bundle for quote rows (PEG, margins, ROE, P/E, net debt). */
export async function loadTtmQuoteBundle(symbol: string): Promise<TtmQuoteBundle> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return emptyTtmQuoteBundle();
  try {
    const [ratiosRow, kmRow] = await Promise.all([
      fetchRatiosTtm(sym),
      fetchKeyMetricsTtm(sym),
    ]);
    return ttmQuoteBundleFromSources(ratiosRow, kmRow);
  } catch {
    return emptyTtmQuoteBundle();
  }
}

/** @deprecated Prefer `loadTtmQuoteBundle` when you need P/E and debt; kept for /api/metrics-ttm. */
export async function loadTtmRatioTriple(symbol: string): Promise<TtmRatioTriple> {
  const b = await loadTtmQuoteBundle(symbol);
  return {
    priceEarningsToGrowthRatio: b.priceEarningsToGrowthRatio,
    operatingProfitMargin:      b.operatingProfitMargin,
    returnOnEquity:             b.returnOnEquity,
  };
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
