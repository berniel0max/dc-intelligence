export type TimeFrame = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'All';

export const TIME_FRAMES: TimeFrame[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'All'];

export interface OHLCPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  label: string; // x-axis label (empty string = no label shown)
}

interface PeriodConfig {
  points: number;
  annualizedReturn: number;
  periodFraction: number;
  baseVolatility: number;
}

const PERIOD_CONFIG: Record<TimeFrame, PeriodConfig> = {
  '1D':  { points: 24, annualizedReturn: 0.20, periodFraction: 1 / 252,  baseVolatility: 0.006 },
  '1W':  { points: 7,  annualizedReturn: 0.20, periodFraction: 1 / 52,   baseVolatility: 0.012 },
  '1M':  { points: 22, annualizedReturn: 0.20, periodFraction: 1 / 12,   baseVolatility: 0.022 },
  '3M':  { points: 13, annualizedReturn: 0.20, periodFraction: 1 / 4,    baseVolatility: 0.038 },
  'YTD': { points: 18, annualizedReturn: 0.22, periodFraction: 4.2 / 12, baseVolatility: 0.048 },
  '1Y':  { points: 12, annualizedReturn: 0.22, periodFraction: 1,        baseVolatility: 0.055 },
  '5Y':  { points: 20, annualizedReturn: 0.18, periodFraction: 5,        baseVolatility: 0.065 },
  'All': { points: 20, annualizedReturn: 0.15, periodFraction: 10,       baseVolatility: 0.075 },
};

const SECTOR_VOLATILITY: Record<string, number> = {
  base_materials:        0.65,
  specialty_energy:      1.35,
  fabless:               1.85,
  ip_patents:            1.20,
  eda:                   0.90,
  wafer_equip:           1.00,
  fabs:                  0.80,
  idm:                   1.10,
  enterprise_software:   1.10,
  tech_equipment:        0.88,
};

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return Math.abs(h >>> 0);
}

function seededRand(n: number): number {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

// ── X-axis label generation ───────────────────────────────────────────────────

export function getXAxisLabels(timeFrame: TimeFrame, count: number): string[] {
  const labels: string[] = new Array(count).fill('');

  const place = (idx: number, label: string) => {
    const i = Math.max(0, Math.min(count - 1, Math.round(idx)));
    labels[i] = label;
  };

  const spread = (items: string[]) => {
    items.forEach((lbl, i) =>
      place((i / (items.length - 1)) * (count - 1), lbl)
    );
  };

  switch (timeFrame) {
    case '1D':  spread(['9:30', '11am', '1pm', '3pm', '4pm']); break;
    case '1W':  spread(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']); break;
    case '1M':  spread(['Apr 8', 'Apr 15', 'Apr 22', 'Apr 29', 'May 6']); break;
    case '3M':  spread(['Feb', 'Mar', 'Apr', 'May']); break;
    case 'YTD': spread(['Jan', 'Feb', 'Mar', 'Apr', 'May']); break;
    case '1Y':  spread(['May\'25', 'Aug\'25', 'Nov\'25', 'Feb\'26', 'May\'26']); break;
    case '5Y':  spread(['2022', '2023', '2024', '2025', '2026']); break;
    case 'All': spread(['2016', '2018', '2020', '2022', '2024', '2026']); break;
  }

  return labels;
}

// ── Close-price series (line chart) ──────────────────────────────────────────

export function generateChartData(
  id: string,
  currentValue: number,
  timeFrame: TimeFrame
): number[] {
  const { points, annualizedReturn, periodFraction, baseVolatility } =
    PERIOD_CONFIG[timeFrame];
  const volMult = SECTOR_VOLATILITY[id] ?? 1.0;
  const vol = baseVolatility * volMult;
  const seed = hash(`${id}::${timeFrame}`);
  const totalReturn = annualizedReturn * periodFraction;
  const startValue = currentValue / (1 + totalReturn);
  const step = (currentValue - startValue) / (points - 1);
  const values: number[] = [];
  for (let i = 0; i < points; i++) {
    const base = startValue + step * i;
    const noise = (seededRand(seed + i * 17) - 0.5) * 2 * vol * base;
    values.push(Math.max(base + noise, base * 0.2));
  }
  values[values.length - 1] = currentValue;
  return values;
}

// ── OHLC data generator ───────────────────────────────────────────────────────

export function generateCandlestickData(
  id: string,
  currentValue: number,
  timeFrame: TimeFrame
): OHLCPoint[] {
  const { points, annualizedReturn, periodFraction, baseVolatility } =
    PERIOD_CONFIG[timeFrame];

  const volMult = SECTOR_VOLATILITY[id] ?? 1.0;
  const vol = baseVolatility * volMult;
  const seed = hash(`${id}::${timeFrame}`);

  // Generate close prices
  const totalReturn = annualizedReturn * periodFraction;
  const startValue = currentValue / (1 + totalReturn);
  const step = (currentValue - startValue) / (points - 1);

  const closes: number[] = [];
  for (let i = 0; i < points; i++) {
    const base = startValue + step * i;
    const noise = (seededRand(seed + i * 17) - 0.5) * 2 * vol * base;
    closes.push(Math.max(base + noise, base * 0.2));
  }
  closes[closes.length - 1] = currentValue;

  const xLabels = getXAxisLabels(timeFrame, points);
  const wickVol = vol * 1.4;

  return closes.map((close, i) => {
    const prevClose = i > 0 ? closes[i - 1] : close * (1 - vol * 0.5);
    const openNoise = (seededRand(seed + i * 31 + 1) - 0.5) * vol * prevClose;
    const open = Math.max(prevClose + openNoise, prevClose * 0.1);
    const bodyHigh = Math.max(open, close);
    const bodyLow  = Math.min(open, close);
    const high = bodyHigh + seededRand(seed + i * 31 + 2) * wickVol * close;
    const low  = Math.max(bodyLow  - seededRand(seed + i * 31 + 3) * wickVol * close, bodyLow * 0.01);

    return { open, high, low, close, label: xLabels[i] };
  });
}
