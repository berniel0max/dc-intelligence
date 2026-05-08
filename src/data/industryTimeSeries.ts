export type OverviewTimeFrame = '1Y' | '3Y' | '5Y' | 'All';
export const OVERVIEW_TIME_FRAMES: OverviewTimeFrame[] = ['1Y', '3Y', '5Y', 'All'];

export interface StackedBarPoint {
  label: string;
  values: Record<string, number>; // sectorId → billions
}

// Current aggregate market cap per sector (billions) — updated May 2026
export const SECTOR_CURRENT: Record<string, number> = {
  base_materials:       585,   // LIN, APD, FCX, SCCO, VMC, MLM, ENTG, NUE, GTLS, MP, TECK, EMN, ALB, MKSI, SHECY
  specialty_energy:     955,   // GEV, VRT, ETN, CEG, NEE, SO, CARR, EMR, D, IR, JCI, VST, PWR, CCJ, NVT, BE, MOD, VICR
  fabless:             4360,   // NVDA, AVGO, AMD, QCOM, MRVL, NXPI, MPWR, MCHP, ON, ALAB, COHR, CRDO, LSCC, SITM, POWI, POET
  eda:                  460,   // ARM, SNPS, CDNS, ANSS, KEYS, PTC, AZPN, MACOM, ONTO, FORM, RAMBUS, SLAB, AMBA, VECO, LWLG
  wafer_equip:          700,   // ASML, AMAT, LRCX, KLAC, TER, AMKR, ONTO, ACLS, FORM, COHU, IPGP, BRKS, UCTT, KLIC, AEIS
  fabs:                1380,   // TSM, SSNLF, INTC, ASX, AMKR, UMC, GFS, TSEM, WOLF, PLAB, IMOS, ICHR, AEIS, UCTT
  idms:                 720,   // TXN, MU, ADI, INTC, NXPI, MPWR, ON, STM, SWKS, QRVO, LSCC, CRUS, ALGM, SMTC
  enterprise_software: 11300,  // MSFT, GOOGL, AMZN, META, ORCL, SAP, CRM, NOW, PLTR, INTU, ADBE, PANW, NET, WDAY, SNOW, DDOG, MDB
  tech_equipment:      4260,   // AAPL, CSCO, IBM, ANET, HON, DELL, NTAP, PSTG, HPE, SMCI, FLEX, CLS, FFIV, CIEN, LITE, AAOI, VIAV
};

// Stacking order: largest market cap at bottom → smallest at top
export const STACK_ORDER = [
  'enterprise_software', // $11.30T
  'fabless',             // $4.36T
  'tech_equipment',      // $4.26T
  'fabs',                // $1.38T
  'specialty_energy',    // $955B
  'idms',                // $720B
  'wafer_equip',         // $700B
  'base_materials',      // $585B
  'eda',                 // $460B
];

// Annualised growth rates used to project backwards
const ANNUAL_GROWTH: Record<string, number> = {
  base_materials:      0.09,
  specialty_energy:    0.36,
  fabless:             0.42,
  eda:                 0.20,
  wafer_equip:         0.16,
  fabs:                0.18,
  idms:                0.12,
  enterprise_software: 0.22,
  tech_equipment:      0.24,
};

function seededRand(n: number): number {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h >>> 0);
}

interface PeriodSpec {
  labels: string[];
  periodYears: number; // years per step going backwards
}

const PERIOD_SPECS: Record<OverviewTimeFrame, PeriodSpec> = {
  '1Y':  {
    labels:      ['Q2\'25', 'Q3\'25', 'Q4\'25', 'Q1\'26', 'Q2\'26'],
    periodYears: 0.25,
  },
  '3Y':  {
    labels:      ['Q2\'23', 'Q4\'23', 'Q2\'24', 'Q4\'24', 'Q2\'25', 'Q4\'25', 'Q2\'26'],
    periodYears: 0.5,
  },
  '5Y':  {
    labels:      ['2021', '2022', '2023', '2024', '2025', '2026'],
    periodYears: 1,
  },
  'All': {
    labels:      ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    periodYears: 1,
  },
};

export function generateIndustryTimeSeries(tf: OverviewTimeFrame): StackedBarPoint[] {
  const { labels, periodYears } = PERIOD_SPECS[tf];
  const n = labels.length;

  const seriesMap: Record<string, number[]> = {};

  for (const sectorId of STACK_ORDER) {
    const current   = SECTOR_CURRENT[sectorId];
    const annGrowth = ANNUAL_GROWTH[sectorId];
    const seed      = hash(`${sectorId}::industry::${tf}`);
    const values: number[] = new Array(n);

    values[n - 1] = current;
    for (let i = n - 2; i >= 0; i--) {
      const stepsBack = n - 1 - i;
      const decay  = Math.pow(1 + annGrowth, periodYears);
      const noise  = 1 + (seededRand(seed + stepsBack * 13) - 0.5) * 0.05;
      values[i] = values[i + 1] / (decay * noise);
    }
    seriesMap[sectorId] = values;
  }

  return labels.map((label, i) => ({
    label,
    values: Object.fromEntries(STACK_ORDER.map(id => [id, seriesMap[id][i]])),
  }));
}

// Pre-computed totals for the header
export const INDUSTRY_TOTAL_B = Object.values(SECTOR_CURRENT).reduce((a, b) => a + b, 0);

export const INDUSTRY_DAILY_PCT  = 1.48;  // weighted avg
export const INDUSTRY_YTD_PCT    = 28.6;  // weighted avg
