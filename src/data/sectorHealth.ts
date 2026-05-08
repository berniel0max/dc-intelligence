export interface SectorHealth {
  id: string;
  currentMarketCap: string;
  currentMarketCapValue: number; // in billions
  previousMarketCap: string;
  qoqChangePercent: number;
  dailyChangePercent: number;
  ytdChangePercent: number;
  forwardPE: number;             // weighted avg across sector
  netDebt: string;               // display string e.g. "+$12B" or "−$52B"
  netDebtValue: number;          // in billions; positive = debt, negative = net cash
}

export const sectorHealthData: Record<string, SectorHealth> = {
  base_materials: {
    id: 'base_materials',
    currentMarketCap: '$413B',
    currentMarketCapValue: 413,
    previousMarketCap: '$378B',
    qoqChangePercent: 9.2,
    dailyChangePercent: 0.7,
    ytdChangePercent: 12.4,
    forwardPE: 22.6,
    netDebt: '+$18B',
    netDebtValue: 18,
  },
  specialty_energy: {
    id: 'specialty_energy',
    currentMarketCap: '$297B',
    currentMarketCapValue: 297,
    previousMarketCap: '$222B',
    qoqChangePercent: 33.8,
    dailyChangePercent: 1.2,
    ytdChangePercent: 36.4,
    forwardPE: 32.4,
    netDebt: '+$14B',
    netDebtValue: 14,
  },
  fabless: {
    id: 'fabless',
    currentMarketCap: '$4.90T',
    currentMarketCapValue: 4900,
    previousMarketCap: '$4.10T',
    qoqChangePercent: 19.5,
    dailyChangePercent: 2.4,
    ytdChangePercent: 44.8,
    forwardPE: 38.6,
    netDebt: '−$28B',
    netDebtValue: -28,
  },
  eda: {
    id: 'eda',
    currentMarketCap: '$300B',
    currentMarketCapValue: 300,
    previousMarketCap: '$268B',
    qoqChangePercent: 11.9,
    dailyChangePercent: 0.9,
    ytdChangePercent: 19.4,
    forwardPE: 37.8,
    netDebt: '−$2B',
    netDebtValue: -2,
  },
  wafer_equip: {
    id: 'wafer_equip',
    currentMarketCap: '$639B',
    currentMarketCapValue: 639,
    previousMarketCap: '$586B',
    qoqChangePercent: 9.0,
    dailyChangePercent: 1.1,
    ytdChangePercent: 21.3,
    forwardPE: 22.4,
    netDebt: '+$4B',
    netDebtValue: 4,
  },
  fabs: {
    id: 'fabs',
    currentMarketCap: '$1.28T',
    currentMarketCapValue: 1280,
    previousMarketCap: '$1.14T',
    qoqChangePercent: 12.3,
    dailyChangePercent: 1.2,
    ytdChangePercent: 22.0,
    forwardPE: 18.4,
    netDebt: '+$36B',
    netDebtValue: 36,
  },
  idms: {
    id: 'idms',
    currentMarketCap: '$448B',
    currentMarketCapValue: 448,
    previousMarketCap: '$406B',
    qoqChangePercent: 10.3,
    dailyChangePercent: 0.8,
    ytdChangePercent: 14.6,
    forwardPE: 19.8,
    netDebt: '+$28B',
    netDebtValue: 28,
  },
  enterprise_software: {
    id: 'enterprise_software',
    currentMarketCap: '$8.60T',
    currentMarketCapValue: 8600,
    previousMarketCap: '$7.48T',
    qoqChangePercent: 15.0,
    dailyChangePercent: 1.6,
    ytdChangePercent: 28.4,
    forwardPE: 32.2,
    netDebt: '−$120B',
    netDebtValue: -120,
  },
  tech_equipment: {
    id: 'tech_equipment',
    currentMarketCap: '$3.64T',
    currentMarketCapValue: 3640,
    previousMarketCap: '$3.12T',
    qoqChangePercent: 16.7,
    dailyChangePercent: 1.4,
    ytdChangePercent: 24.2,
    forwardPE: 28.6,
    netDebt: '−$48B',
    netDebtValue: -48,
  },
};
