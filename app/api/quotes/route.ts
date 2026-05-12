import {
  fetchEodYtdOneYearBatch,
  fetchQuotes,
  fetchPriceChanges,
  loadTtmRatioTriple,
  type FMPPriceChange,
} from '@/src/lib/fmp';
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

function mockQuotesResponse(symbols: string[], mockReason: string) {
  const fallback = symbols.map(sym => tickerData[sym]).filter(Boolean);
  return Response.json(fallback, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Data-Source': 'mock-fallback',
      'X-Mock-Reason': mockReason,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) {
    return Response.json({ error: 'symbols query param required' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const apiKeyRaw = process.env.FMP_API_KEY?.trim();
  if (!apiKeyRaw || apiKeyRaw === 'your_api_key_here') {
    console.warn('[/api/quotes] FMP_API_KEY is not set on the server (e.g. add it in Vercel env + redeploy)');
    return mockQuotesResponse(symbols, 'missing-env');
  }

  try {
    const quotes = await fetchQuotes(symbols);
    if (!quotes.length) {
      throw new Error('FMP returned no quote data (check API key and symbol list)');
    }

    /** Chunked stock-price-change; missing symbols (e.g. 429) filled from EOD — avoids stale static YTD/1Y. */
    const changeRows = await fetchPriceChanges(symbols);
    const changeBySym = new Map(changeRows.map(r => [r.symbol.toUpperCase(), r]));
    const missingChg = symbols.map(s => s.trim().toUpperCase()).filter(s => !changeBySym.has(s));
    const eodMap =
      missingChg.length > 0 ? await fetchEodYtdOneYearBatch(missingChg) : new Map();

    /** PEG / operating margin / ROE — same TTM bundle as /api/metrics-ttm (guaranteed on each row). */
    const ttmRows = await Promise.all(quotes.map(q => loadTtmRatioTriple(q.symbol)));
    const ttmBySym = Object.fromEntries(
      quotes.map((q, i) => [String(q.symbol ?? '').toUpperCase(), ttmRows[i]]),
    );

    const result = quotes.map(q => {
      const symUp = String(q.symbol ?? '').toUpperCase();
      const chg  = changeBySym.get(symUp);
      const eod  = eodMap.get(symUp);
      const mock = tickerData[symUp];
      const ttm  = ttmBySym[symUp];

      const ytdLive = chg ? chg.ytd : (eod?.ytd ?? null);
      const y1Live  = chg ? chg['1Y'] : (eod?.oneY ?? null);

      const periodFromEod =
        !chg && eod && (eod.ytd != null || eod.oneY != null)
          ? { ytd: eod.ytd ?? undefined, '1Y': eod.oneY ?? undefined }
          : undefined;

      return {
        symbol:               symUp,
        name:                 q.name  || mock?.name  || q.symbol,
        price:                q.price,
        marketCap:            fmtCap(q.marketCap),
        marketCapValue:       q.marketCap / 1e9,   // billions
        dailyChangePercent:   q.changePercentage,  // stable API field name
        ytdChangePercent:     ytdLive ?? mock?.ytdChangePercent ?? 0,
        ttmChangePercent:     y1Live  ?? mock?.ttmChangePercent  ?? 0,
        forwardPE:            mock?.forwardPE       ?? null,
        ttmPE:                mock?.ttmPE           ?? null,  // stable /quote no longer includes pe
        netDebt:              mock?.netDebt         ?? 'N/A',
        netDebtValue:         mock?.netDebtValue    ?? 0,
        priceEarningsToGrowthRatio:
          ttm?.priceEarningsToGrowthRatio ?? mock?.priceEarningsToGrowthRatio ?? null,
        operatingProfitMargin:
          ttm?.operatingProfitMargin ?? mock?.operatingProfitMargin ?? null,
        returnOnEquity:
          ttm?.returnOnEquity ?? mock?.returnOnEquity ?? null,
        periodChanges:        chg ? periodChangesFromFmp(chg) : periodFromEod,
      };
    });

    return Response.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Data-Source': 'fmp-live',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/quotes] FMP error (${msg.slice(0, 120)}) — returning available mock data`);

    return mockQuotesResponse(symbols, 'fmp-error');
  }
}
