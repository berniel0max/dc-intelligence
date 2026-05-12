/**
 * Ticker symbols always treated as “favorited” (pinned above cap sort).
 * Edit this list to match your defaults; symbols are normalized to uppercase.
 *
 * Stars for these tickers cannot be cleared in the UI (they stay pinned).
 * Extra favorites from the ★ control still save to localStorage.
 */
export const HARDCODED_FAVORITE_TICKERS: string[] = [
  'BE',
  'FCX',
  'SCCO',
  'SHECY',
  'MKSI',
  'MP',
  'GEV',
  'NEE',
  'ETN',
  'VRT',
  'PWR',
  'CCJ',
  'NVT',
  'MOD',
  'VICR',
  'NVDA',
  'AVGO',
  'AMD',
  'QCOM',
  'MRVL',
  'COHR',
  'ON',
  'CRDO',
  'ALAB',
  'ARM',
  'FORM',
  'ASML',
  'LRCX',
  'AMAT',
  'KLAC',
  'TSM',
  'INTC',
  'MU',
  'TXN',
  'GOOGL',
  'NET',
  'CSCO',
  'DELL',
  'SMCI',
  'LITE',
  'AAOI',
];

export function hardcodedFavoriteTickerSet(): Set<string> {
  return new Set(
    HARDCODED_FAVORITE_TICKERS.map(s => String(s).trim().toUpperCase()).filter(Boolean),
  );
}
