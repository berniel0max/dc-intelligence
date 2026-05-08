import { fetchQuotes, fetchPriceChanges, type FMPPriceChange } from '@/src/lib/fmp';
import { tickerData, type TickerData } from '@/src/data/tickerData';

function fmtCap(dollars: number): string {
  const b = dollars / 1e9;
  if (b >= 1000) return `$${(b / 1000).toFixed(2)}T`;
  if (b >= 100)  return `$${b.toFixed(0)}B`;
  if (b >= 1)    return `$${b.toFixed(1)}B`;
  return `$${(dollars / 1e6).toFixed(0)}M`;
}

function periodChangesFromFmp(chg: FMPPriceChange | undefined): TickerData['periodChanges'] {
  if (!chg) return undefined;
  return {
    '1D': chg['1D'],
    '5D': chg['5D'],
    '1M': chg['1M'],
    '3M': chg['3M'],
    '6M': chg['6M'],
    ytd:  chg.ytd,
    '1Y': chg['1Y'],
    '3Y': chg['3Y'],
    '5Y': chg['5Y'],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) {
    return Response.json({ error: 'symbols query param required' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  try {
    // Two FMP calls: batch quote + batch price-change
    const [quotes, changes] = await Promise.all([
      fetchQuotes(symbols),
      fetchPriceChanges(symbols),
    ]);

    const changeMap = Object.fromEntries(changes.map(c => [c.symbol, c]));

    const result = quotes.map(q => {
      const chg  = changeMap[q.symbol];
      const mock = tickerData[q.symbol];           // fallback for fields not in free quote

      return {
        symbol:               q.symbol,
        name:                 q.name  || mock?.name  || q.symbol,
        price:                q.price,
        marketCap:            fmtCap(q.marketCap),
        marketCapValue:       q.marketCap / 1e9,   // billions
        dailyChangePercent:   q.changePercentage,  // stable API field name
        ytdChangePercent:     chg?.ytd              ?? mock?.ytdChangePercent  ?? 0,
        ttmChangePercent:     chg?.['1Y']           ?? mock?.ttmChangePercent  ?? 0,
        forwardPE:            mock?.forwardPE       ?? null,
        ttmPE:                mock?.ttmPE           ?? null,  // stable /quote no longer includes pe
        netDebt:              mock?.netDebt         ?? 'N/A',
        netDebtValue:         mock?.netDebtValue    ?? 0,
        periodChanges:        periodChangesFromFmp(chg),
      };
    });

    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/quotes] FMP error (${msg.slice(0, 120)}) — returning available mock data`);

    // Return mock data for known tickers; unknown tickers (e.g. manually added) return empty
    const fallback = symbols.map(sym => tickerData[sym]).filter(Boolean);

    return Response.json(fallback, {
      headers: { 'X-Data-Source': 'mock-fallback' },
    });
  }
}
