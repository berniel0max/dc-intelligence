export interface TickerData {
  symbol: string;
  name: string;
  price: number;
  marketCap: string;
  marketCapValue: number;     // in billions
  dailyChangePercent: number;
  ytdChangePercent: number;
  ttmChangePercent: number;   // trailing 12-month price return
  forwardPE: number | null;
  ttmPE: number | null;       // trailing 12-month P/E (null = NM)
  netDebt: string;
  netDebtValue: number;       // positive = debt, negative = net cash
}

export const tickerData: Record<string, TickerData> = {
  // ── Base Materials & Metals ──────────────────────────────────────────────────
  LIN:   { symbol: 'LIN',   name: 'Linde',               price:  490.42, marketCap: '$230B',  marketCapValue:  230, dailyChangePercent:  0.6, ytdChangePercent:  11.2, ttmChangePercent:  18.4, forwardPE: 30.2, ttmPE:  34.2, netDebt: '+$8.4B',  netDebtValue:  8.4 },
  APD:   { symbol: 'APD',   name: 'Air Products',         price:  268.14, marketCap: '$59B',   marketCapValue:   59, dailyChangePercent:  0.9, ytdChangePercent:   8.4, ttmChangePercent:  12.6, forwardPE: 20.4, ttmPE:  24.8, netDebt: '+$6.2B',  netDebtValue:  6.2 },
  FCX:   { symbol: 'FCX',   name: 'Freeport-McMoRan',     price:   43.18, marketCap: '$62B',   marketCapValue:   62, dailyChangePercent:  1.2, ytdChangePercent:  18.6, ttmChangePercent:  28.4, forwardPE: 17.8, ttmPE:  22.4, netDebt: '+$4.2B',  netDebtValue:  4.2 },
  SHECY: { symbol: 'SHECY', name: 'Shin-Etsu Chemical',   price:   37.86, marketCap: '$48B',   marketCapValue:   48, dailyChangePercent:  0.5, ytdChangePercent:   9.6, ttmChangePercent:  14.2, forwardPE: 14.8, ttmPE:  18.6, netDebt: '−$2.4B',  netDebtValue: -2.4 },
  ENTG:  { symbol: 'ENTG',  name: 'Entegris',             price:   99.86, marketCap: '$14B',   marketCapValue:   14, dailyChangePercent:  1.8, ytdChangePercent:  22.6, ttmChangePercent:  38.6, forwardPE: 36.8, ttmPE:  48.6, netDebt: '+$1.2B',  netDebtValue:  1.2 },
  SCCO:  { symbol: 'SCCO',  name: 'Southern Copper',      price:   91.44, marketCap: '$71B',   marketCapValue:   71, dailyChangePercent:  0.8, ytdChangePercent:  14.2, ttmChangePercent:  22.8, forwardPE: 19.4, ttmPE:  22.8, netDebt: '+$3.8B',  netDebtValue:  3.8 },

  // ── Specialty Energy & Equipment ────────────────────────────────────────────
  GEV:   { symbol: 'GEV',   name: 'GE Vernova',           price:  322.50, marketCap: '$88B',   marketCapValue:   88, dailyChangePercent:  1.5, ytdChangePercent:  48.2, ttmChangePercent:  96.4, forwardPE: 42.0, ttmPE:  null, netDebt: '+$2.4B',  netDebtValue:  2.4 },
  VRT:   { symbol: 'VRT',   name: 'Vertiv',               price:  126.18, marketCap: '$44B',   marketCapValue:   44, dailyChangePercent:  2.1, ytdChangePercent:  61.3, ttmChangePercent: 124.8, forwardPE: 62.4, ttmPE:  80.2, netDebt: '+$1.8B',  netDebtValue:  1.8 },
  BE:    { symbol: 'BE',    name: 'Bloom Energy',          price:   14.76, marketCap: '$5B',    marketCapValue:    5, dailyChangePercent:  0.8, ytdChangePercent:  18.4, ttmChangePercent:  28.6, forwardPE: 45.2, ttmPE:  null, netDebt: '+$0.4B',  netDebtValue:  0.4 },
  CCJ:   { symbol: 'CCJ',   name: 'Cameco',               price:   48.32, marketCap: '$22B',   marketCapValue:   22, dailyChangePercent:  1.4, ytdChangePercent:  32.1, ttmChangePercent:  48.4, forwardPE: 28.6, ttmPE:  38.4, netDebt: '+$0.8B',  netDebtValue:  0.8 },
  ETN:   { symbol: 'ETN',   name: 'Eaton',                price:  312.44, marketCap: '$120B',  marketCapValue:  120, dailyChangePercent:  0.9, ytdChangePercent:  22.4, ttmChangePercent:  42.6, forwardPE: 28.4, ttmPE:  32.4, netDebt: '+$4.2B',  netDebtValue:  4.2 },

  // ── Electronic Design Automation ─────────────────────────────────────────────
  SNPS:  { symbol: 'SNPS',  name: 'Synopsys',             price:  488.72, marketCap: '$72B',   marketCapValue:   72, dailyChangePercent:  0.7, ytdChangePercent:  16.4, ttmChangePercent:  28.4, forwardPE: 34.6, ttmPE:  48.6, netDebt: '−$1.2B',  netDebtValue: -1.2 },
  CDNS:  { symbol: 'CDNS',  name: 'Cadence',              price:  298.50, marketCap: '$82B',   marketCapValue:   82, dailyChangePercent:  1.1, ytdChangePercent:  20.8, ttmChangePercent:  36.2, forwardPE: 42.2, ttmPE:  56.8, netDebt: '−$0.8B',  netDebtValue: -0.8 },
  ANSS:  { symbol: 'ANSS',  name: 'Ansys',                price:  364.18, marketCap: '$16B',   marketCapValue:   16, dailyChangePercent:  0.8, ytdChangePercent:  12.6, ttmChangePercent:  18.4, forwardPE: 28.4, ttmPE:  40.2, netDebt: '−$0.2B',  netDebtValue: -0.2 },
  ARM:   { symbol: 'ARM',   name: 'Arm Holdings',         price:  148.62, marketCap: '$154B',  marketCapValue:  154, dailyChangePercent:  1.4, ytdChangePercent:  38.2, ttmChangePercent:  72.6, forwardPE: 62.4, ttmPE:  null, netDebt: '−$1.8B',  netDebtValue: -1.8 },

  // ── Wafer Fab & Packaging ────────────────────────────────────────────────────
  ASML:  { symbol: 'ASML',  name: 'ASML',                 price:  692.40, marketCap: '$270B',  marketCapValue:  270, dailyChangePercent:  1.4, ytdChangePercent:  18.6, ttmChangePercent:  24.6, forwardPE: 30.4, ttmPE:  42.6, netDebt: '−$2.4B',  netDebtValue: -2.4 },
  LRCX:  { symbol: 'LRCX',  name: 'Lam Research',         price:  906.14, marketCap: '$122B',  marketCapValue:  122, dailyChangePercent:  1.2, ytdChangePercent:  22.4, ttmChangePercent:  38.2, forwardPE: 18.6, ttmPE:  22.4, netDebt: '−$4.2B',  netDebtValue: -4.2 },
  AMAT:  { symbol: 'AMAT',  name: 'Applied Materials',    price:  172.36, marketCap: '$148B',  marketCapValue:  148, dailyChangePercent:  0.9, ytdChangePercent:  24.8, ttmChangePercent:  46.4, forwardPE: 19.8, ttmPE:  24.8, netDebt: '−$2.8B',  netDebtValue: -2.8 },
  KLAC:  { symbol: 'KLAC',  name: 'KLA Corporation',      price:  768.92, marketCap: '$82B',   marketCapValue:   82, dailyChangePercent:  1.3, ytdChangePercent:  18.2, ttmChangePercent:  36.8, forwardPE: 20.2, ttmPE:  26.4, netDebt: '−$1.6B',  netDebtValue: -1.6 },
  TER:   { symbol: 'TER',   name: 'Teradyne',             price:   88.44, marketCap: '$14B',   marketCapValue:   14, dailyChangePercent:  1.1, ytdChangePercent:  16.8, ttmChangePercent:  24.4, forwardPE: 22.8, ttmPE:  28.6, netDebt: '−$0.6B',  netDebtValue: -0.6 },

  // ── Foundries & Manufacturing ────────────────────────────────────────────────
  TSM:   { symbol: 'TSM',   name: 'TSMC',                 price:  174.28, marketCap: '$900B',  marketCapValue:  900, dailyChangePercent:  1.6, ytdChangePercent:  30.8, ttmChangePercent:  56.2, forwardPE: 20.4, ttmPE:  24.8, netDebt: '+$8.0B',  netDebtValue:  8.0 },
  INTC:  { symbol: 'INTC',  name: 'Intel',                price:   20.44, marketCap: '$88B',   marketCapValue:   88, dailyChangePercent: -0.8, ytdChangePercent: -12.4, ttmChangePercent: -24.4, forwardPE: 35.4, ttmPE:  null, netDebt: '+$24B',   netDebtValue:  24  },
  GFS:   { symbol: 'GFS',   name: 'GlobalFoundries',      price:   35.62, marketCap: '$20B',   marketCapValue:   20, dailyChangePercent:  0.8, ytdChangePercent:   8.4, ttmChangePercent:  12.8, forwardPE: 22.6, ttmPE:  28.4, netDebt: '+$4.0B',  netDebtValue:  4.0 },
  SSNLF: { symbol: 'SSNLF', name: 'Samsung Electronics',  price:   51.28, marketCap: '$272B',  marketCapValue:  272, dailyChangePercent:  0.8, ytdChangePercent:   6.2, ttmChangePercent:   8.4, forwardPE: 11.2, ttmPE:  13.4, netDebt: '+$20B',   netDebtValue:  20  },

  // ── Fabless Chip Designers ───────────────────────────────────────────────────
  NVDA:  { symbol: 'NVDA',  name: 'Nvidia',               price:  118.46, marketCap: '$2.90T', marketCapValue: 2900, dailyChangePercent:  2.8, ytdChangePercent:  44.2, ttmChangePercent: 186.4, forwardPE: 42.0, ttmPE:  65.2, netDebt: '−$26B',   netDebtValue: -26  },
  AMD:   { symbol: 'AMD',   name: 'AMD',                  price:  108.22, marketCap: '$176B',  marketCapValue:  176, dailyChangePercent:  1.9, ytdChangePercent:  18.6, ttmChangePercent:  24.8, forwardPE: 24.8, ttmPE:  null, netDebt: '−$2.4B',  netDebtValue: -2.4 },
  AVGO:  { symbol: 'AVGO',  name: 'Broadcom',             price:  220.64, marketCap: '$1.04T', marketCapValue: 1040, dailyChangePercent:  1.6, ytdChangePercent:  38.4, ttmChangePercent:  68.4, forwardPE: 27.6, ttmPE:  38.2, netDebt: '+$38B',   netDebtValue:  38  },
  QCOM:  { symbol: 'QCOM',  name: 'Qualcomm',             price:  158.44, marketCap: '$172B',  marketCapValue:  172, dailyChangePercent:  1.2, ytdChangePercent:  14.8, ttmChangePercent:  22.6, forwardPE: 16.4, ttmPE:  19.2, netDebt: '+$10B',   netDebtValue:  10  },
  MRVL:  { symbol: 'MRVL',  name: 'Marvell Technology',   price:   72.18, marketCap: '$62B',   marketCapValue:   62, dailyChangePercent:  2.2, ytdChangePercent:  36.4, ttmChangePercent:  68.8, forwardPE: 32.4, ttmPE:  null, netDebt: '+$4.2B',  netDebtValue:  4.2 },

  // ── Integrated Device Manufacturers ─────────────────────────────────────────
  MU:    { symbol: 'MU',    name: 'Micron Technology',    price:  104.82, marketCap: '$115B',  marketCapValue:  115, dailyChangePercent:  1.6, ytdChangePercent:  28.4, ttmChangePercent:  48.6, forwardPE: 12.8, ttmPE:  null, netDebt: '+$6.4B',  netDebtValue:  6.4 },
  TXN:   { symbol: 'TXN',   name: 'Texas Instruments',    price:  178.64, marketCap: '$162B',  marketCapValue:  162, dailyChangePercent:  0.6, ytdChangePercent:   8.4, ttmChangePercent:  12.2, forwardPE: 25.4, ttmPE:  32.8, netDebt: '+$6.8B',  netDebtValue:  6.8 },
  ADI:   { symbol: 'ADI',   name: 'Analog Devices',       price:  218.46, marketCap: '$113B',  marketCapValue:  113, dailyChangePercent:  0.7, ytdChangePercent:  10.4, ttmChangePercent:  18.6, forwardPE: 24.2, ttmPE:  30.4, netDebt: '+$4.6B',  netDebtValue:  4.6 },

  // ── Specialty Energy additions ───────────────────────────────────────────────
  VICR:  { symbol: 'VICR',  name: 'Vicor Corporation',    price:   42.18, marketCap: '$2.2B',  marketCapValue:  2.2, dailyChangePercent:  1.8, ytdChangePercent:  24.6, ttmChangePercent:  42.4, forwardPE: 38.6, ttmPE:  null, netDebt: '−$0.1B',  netDebtValue: -0.1 },
  MOD:   { symbol: 'MOD',   name: 'Modine Manufacturing', price:   82.44, marketCap: '$4.2B',  marketCapValue:  4.2, dailyChangePercent:  1.4, ytdChangePercent:  32.8, ttmChangePercent:  62.4, forwardPE: 20.4, ttmPE:  26.8, netDebt: '+$0.3B',  netDebtValue:  0.3 },
  NVT:   { symbol: 'NVT',   name: 'nVent Electric',       price:   58.22, marketCap: '$9.6B',  marketCapValue:  9.6, dailyChangePercent:  0.9, ytdChangePercent:  18.2, ttmChangePercent:  32.6, forwardPE: 18.8, ttmPE:  22.4, netDebt: '+$1.4B',  netDebtValue:  1.4 },

  // ── Enterprise / Consumer Software ──────────────────────────────────────────
  MSFT:  { symbol: 'MSFT',  name: 'Microsoft',            price:  434.28, marketCap: '$3.23T', marketCapValue: 3230, dailyChangePercent:  1.1, ytdChangePercent:  22.6, ttmChangePercent:  38.4, forwardPE: 34.2, ttmPE:  38.6, netDebt: '−$42B',   netDebtValue: -42  },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet',             price:  178.44, marketCap: '$2.18T', marketCapValue: 2180, dailyChangePercent:  1.4, ytdChangePercent:  18.4, ttmChangePercent:  28.6, forwardPE: 22.4, ttmPE:  26.8, netDebt: '−$60B',   netDebtValue: -60  },
  AMZN:  { symbol: 'AMZN',  name: 'Amazon',               price:  212.64, marketCap: '$2.24T', marketCapValue: 2240, dailyChangePercent:  1.6, ytdChangePercent:  24.8, ttmChangePercent:  42.4, forwardPE: 38.6, ttmPE:  44.2, netDebt: '−$28B',   netDebtValue: -28  },
  PLTR:  { symbol: 'PLTR',  name: 'Palantir',             price:   92.46, marketCap: '$210B',  marketCapValue:  210, dailyChangePercent:  3.2, ytdChangePercent:  68.4, ttmChangePercent: 148.6, forwardPE: 88.4, ttmPE:  null, netDebt: '−$3.6B',  netDebtValue: -3.6 },
  ORCL:  { symbol: 'ORCL',  name: 'Oracle',               price:  152.18, marketCap: '$418B',  marketCapValue:  418, dailyChangePercent:  0.9, ytdChangePercent:  28.4, ttmChangePercent:  48.6, forwardPE: 24.8, ttmPE:  32.4, netDebt: '+$72B',   netDebtValue:  72  },
  ADBE:  { symbol: 'ADBE',  name: 'Adobe',                price:  388.44, marketCap: '$172B',  marketCapValue:  172, dailyChangePercent:  0.8, ytdChangePercent:  12.4, ttmChangePercent:  18.2, forwardPE: 26.8, ttmPE:  32.4, netDebt: '−$2.4B',  netDebtValue: -2.4 },
  SNOW:  { symbol: 'SNOW',  name: 'Snowflake',            price:  136.82, marketCap: '$46B',   marketCapValue:   46, dailyChangePercent:  2.4, ytdChangePercent:  38.4, ttmChangePercent:  62.8, forwardPE: 68.4, ttmPE:  null, netDebt: '−$1.8B',  netDebtValue: -1.8 },

  // ── Tech Equipment / Devices ────────────────────────────────────────────────
  AAPL:  { symbol: 'AAPL',  name: 'Apple',                price:  214.24, marketCap: '$3.22T', marketCapValue: 3220, dailyChangePercent:  0.8, ytdChangePercent:  16.4, ttmChangePercent:  22.4, forwardPE: 31.4, ttmPE:  34.8, netDebt: '−$52B',   netDebtValue: -52  },
  DELL:  { symbol: 'DELL',  name: 'Dell Technologies',    price:   92.44, marketCap: '$68B',   marketCapValue:   68, dailyChangePercent:  1.6, ytdChangePercent:  28.6, ttmChangePercent:  48.4, forwardPE: 12.4, ttmPE:  14.2, netDebt: '+$18B',   netDebtValue:  18  },
  SMCI:  { symbol: 'SMCI',  name: 'Super Micro',          price:   38.18, marketCap: '$22B',   marketCapValue:   22, dailyChangePercent:  3.4, ytdChangePercent:  42.8, ttmChangePercent:  88.6, forwardPE: 14.8, ttmPE:  22.4, netDebt: '+$0.8B',  netDebtValue:  0.8 },
  CSCO:  { symbol: 'CSCO',  name: 'Cisco',                price:   58.64, marketCap: '$234B',  marketCapValue:  234, dailyChangePercent:  0.6, ytdChangePercent:  10.2, ttmChangePercent:  16.4, forwardPE: 15.8, ttmPE:  18.4, netDebt: '+$8.4B',  netDebtValue:  8.4 },
  HPE:   { symbol: 'HPE',   name: 'HP Enterprise',        price:   17.44, marketCap: '$24B',   marketCapValue:   24, dailyChangePercent:  1.2, ytdChangePercent:  18.4, ttmChangePercent:  28.6, forwardPE: 11.2, ttmPE:  14.6, netDebt: '+$6.2B',  netDebtValue:  6.2 },
  CLS:   { symbol: 'CLS',   name: 'Celestica',            price:   62.18, marketCap: '$8.2B',  marketCapValue:  8.2, dailyChangePercent:  2.8, ytdChangePercent:  48.4, ttmChangePercent:  96.8, forwardPE: 18.4, ttmPE:  22.6, netDebt: '+$0.4B',  netDebtValue:  0.4 },
};
