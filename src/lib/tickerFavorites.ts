import { hardcodedFavoriteTickerSet } from '@/src/data/hardcodedFavoriteTickers';

export const TICKER_FAVORITES_STORAGE_KEY = 'dc-intelligence-favorite-tickers';

const LS_KEY = TICKER_FAVORITES_STORAGE_KEY;

function loadExtraFavoriteTickers(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr.map(String).map(s => s.trim().toUpperCase()).filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

/** Hardcoded symbols ∪ extras saved in localStorage (client only). */
export function loadFavoriteTickers(): Set<string> {
  const hard  = hardcodedFavoriteTickerSet();
  const extra = loadExtraFavoriteTickers();
  return new Set([...hard, ...extra]);
}

function normTicker(s: string): string {
  return s.trim().toUpperCase();
}

/** Persist only symbols that are not hardcoded (hardcoded list lives in source). */
export function saveFavoriteTickers(symbols: Iterable<string>) {
  if (typeof window === 'undefined') return;
  const hard = hardcodedFavoriteTickerSet();
  const extra = [
    ...new Set(
      [...symbols].map(normTicker).filter(s => s.length > 0 && !hard.has(s)),
    ),
  ];
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(extra));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isHardcodedFavorite(sym: string): boolean {
  return hardcodedFavoriteTickerSet().has(sym.trim().toUpperCase());
}
