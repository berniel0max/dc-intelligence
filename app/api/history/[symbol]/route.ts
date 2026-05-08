import { fetchDailyHistory, fetchIntradayHistory } from '@/src/lib/fmp';

type TimeFrame = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'All';

function dateRange(tf: TimeFrame): { from: string; to: string } {
  const to   = new Date();
  const from = new Date();

  switch (tf) {
    case '1W':  from.setDate(from.getDate() - 8);              break;
    case '1M':  from.setMonth(from.getMonth() - 1);            break;
    case '3M':  from.setMonth(from.getMonth() - 3);            break;
    case 'YTD': from.setMonth(0); from.setDate(1);             break;
    case '1Y':  from.setFullYear(from.getFullYear() - 1);      break;
    case '5Y':  from.setFullYear(from.getFullYear() - 5);      break;
    case 'All': from.setFullYear(from.getFullYear() - 15);     break;
    default:    from.setDate(from.getDate() - 2);              break; // 1D fallback
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

/** Build evenly-spaced X-axis labels from an array of ISO date strings. */
function buildLabels(dates: string[], tf: TimeFrame): string[] {
  const n = dates.length;
  if (!n) return [];

  const target = tf === '1D' ? 6 : 7;
  const step   = Math.max(1, Math.floor(n / target));

  return dates.map((d, i) => {
    if (i % step !== 0 && i !== n - 1) return '';
    const dt  = new Date(d.length === 10 ? d + 'T12:00:00' : d);
    const mon = dt.toLocaleString('en-US', { month: 'short' });
    const yr  = dt.getFullYear().toString().slice(2);

    if (tf === '1D')              return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (tf === '5Y' || tf === 'All') return `'${yr}`;
    if (tf === '1Y')              return `${mon} '${yr}`;
    // 1W, 1M, 3M, YTD → show month + day
    return `${mon} ${dt.getDate()}`;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const tf = (searchParams.get('tf') ?? '3M') as TimeFrame;

  try {
    let bars;

    if (tf === '1D') {
      bars = await fetchIntradayHistory(symbol.toUpperCase());
    } else {
      const { from, to } = dateRange(tf);
      bars = await fetchDailyHistory(symbol.toUpperCase(), from, to);
    }

    if (!bars.length) {
      return Response.json({ error: 'No data' }, { status: 404 });
    }

    const dates  = bars.map(b => b.date);
    const values = bars.map(b => b.close);
    const labels = buildLabels(dates, tf);

    return Response.json({ values, labels, dates }, {
      headers: {
        'Cache-Control': tf === '1D'
          ? 'public, s-maxage=300'           // 5-min cache for intraday
          : 'public, s-maxage=3600',          // 1-hr cache for daily
      },
    });
  } catch (err) {
    console.error(`[/api/history/${symbol}] FMP error:`, err);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
