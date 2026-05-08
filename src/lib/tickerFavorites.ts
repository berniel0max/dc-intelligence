const LS_KEY = 'dc-intelligence-favorite-tickers';

export function loadFavoriteTickers(): Set<string> {
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

export function saveFavoriteTickers(symbols: Iterable<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...symbols]));
  } catch {
    /* ignore quota / private mode */
  }
}
