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
    currentMarketCap: '$585B',
    currentMarketCapValue: 585,
    previousMarketCap: '$536B',
    qoqChangePercent: 9.2,
    dailyChangePercent: 0.7,
    ytdChangePercent: 12.4,
    forwardPE: 21.4,
    netDebt: '+$24B',
    netDebtValue: 24,
  },
  specialty_energy: {
    id: 'specialty_energy',
    currentMarketCap: '$955B',
    currentMarketCapValue: 955,
    previousMarketCap: '$714B',
    qoqChangePercent: 33.8,
    dailyChangePercent: 1.2,
    ytdChangePercent: 28.6,
    forwardPE: 24.8,
    netDebt: '+$130B',
    netDebtValue: 130,
  },
  fabless: {
    id: 'fabless',
    currentMarketCap: '$4.36T',
    currentMarketCapValue: 4360,
    previousMarketCap: '$3.65T',
    qoqChangePercent: 19.5,
    dailyChangePercent: 2.4,
    ytdChangePercent: 44.8,
    forwardPE: 36.2,
    netDebt: '−$18B',
    netDebtValue: -18,
  },
  eda: {
    id: 'eda',
    currentMarketCap: '$460B',
    currentMarketCapValue: 460,
    previousMarketCap: '$411B',
    qoqChangePercent: 11.9,
    dailyChangePercent: 0.9,
    ytdChangePercent: 22.8,
    forwardPE: 42.6,
    netDebt: '−$4B',
    netDebtValue: -4,
  },
  wafer_equip: {
    id: 'wafer_equip',
    currentMarketCap: '$700B',
    currentMarketCapValue: 700,
    previousMarketCap: '$642B',
    qoqChangePercent: 9.0,
    dailyChangePercent: 1.1,
    ytdChangePercent: 21.3,
    forwardPE: 22.4,
    netDebt: '+$4B',
    netDebtValue: 4,
  },
  fabs: {
    id: 'fabs',
    currentMarketCap: '$1.38T',
    currentMarketCapValue: 1380,
    previousMarketCap: '$1.23T',
    qoqChangePercent: 12.3,
    dailyChangePercent: 1.2,
    ytdChangePercent: 22.0,
    forwardPE: 18.4,
    netDebt: '+$62B',
    netDebtValue: 62,
  },
  idms: {
    id: 'idms',
    currentMarketCap: '$720B',
    currentMarketCapValue: 720,
    previousMarketCap: '$653B',
    qoqChangePercent: 10.3,
    dailyChangePercent: 0.8,
    ytdChangePercent: 14.6,
    forwardPE: 20.6,
    netDebt: '+$55B',
    netDebtValue: 55,
  },
  enterprise_software: {
    id: 'enterprise_software',
    currentMarketCap: '$11.30T',
    currentMarketCapValue: 11300,
    previousMarketCap: '$9.83T',
    qoqChangePercent: 15.0,
    dailyChangePercent: 1.6,
    ytdChangePercent: 28.4,
    forwardPE: 30.8,
    netDebt: '−$200B',
    netDebtValue: -200,
  },
  tech_equipment: {
    id: 'tech_equipment',
    currentMarketCap: '$4.26T',
    currentMarketCapValue: 4260,
    previousMarketCap: '$3.65T',
    qoqChangePercent: 16.7,
    dailyChangePercent: 1.4,
    ytdChangePercent: 24.2,
    forwardPE: 30.2,
    netDebt: '−$10B',
    netDebtValue: -10,
  },
};
