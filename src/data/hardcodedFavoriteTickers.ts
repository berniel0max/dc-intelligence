/**
 * Ticker symbols always treated as “favorited” (pinned above cap sort).
 * Edit this list to match your defaults; symbols are normalized to uppercase.
 *
 * Stars for these tickers cannot be cleared in the UI (they stay pinned).
 * Extra favorites from the ★ control still save to localStorage.
 */
export const HARDCODED_FAVORITE_TICKERS: string[] = [
  'BE',
];

export function hardcodedFavoriteTickerSet(): Set<string> {
  return new Set(
    HARDCODED_FAVORITE_TICKERS.map(s => String(s).trim().toUpperCase()).filter(Boolean),
  );
}
