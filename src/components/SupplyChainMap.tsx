import { TickerFavoritesProvider } from '@/src/context/TickerFavoritesContext';
import sectorsData from '@/src/data/sectors.json';
import { sectorHealthData, SectorHealth } from '@/src/data/sectorHealth';
import SectorCard from '@/src/components/SectorCard';

// ── Types ─────────────────────────────────────────────────────────────────

type StoredLayer = {
  id: string;
  label: string;
  sublabel: string;
  sectorIds: string[];
};

type StoredSector = {
  id: string;
  name: string;
  description: string;
};

type LayoutState = {
  layers: StoredLayer[];
  sectors: Record<string, StoredSector>;
};

// ── Constants ─────────────────────────────────────────────────────────────

const ACCENT_PALETTE = [
  '#60a5fa', '#f59e0b', '#22c55e', '#a78bfa',
  '#06b6d4', '#f97316', '#64748b', '#ec4899', '#818cf8',
  '#34d399', '#fb923c', '#38bdf8', '#c084fc',
];

const FIXED_ACCENT: Record<string, string> = {
  base_materials:      '#60a5fa',
  specialty_energy:    '#f59e0b',
  fabless:             '#22c55e',
  eda:                 '#a78bfa',
  wafer_equip:         '#06b6d4',
  fabs:                '#f97316',
  idms:                '#64748b',
  enterprise_software: '#ec4899',
  tech_equipment:      '#818cf8',
};

// ── Seed (fixed layout; was previously editable via localStorage) ───────────

function buildSeed(): LayoutState {
  const layers: StoredLayer[] = [
    { id: 'layer-1', label: 'Layer 1 — Resources & Energy',    sublabel: 'The physical foundation: raw materials and the power grid.',          sectorIds: ['base_materials', 'specialty_energy'] },
    { id: 'layer-2', label: 'Layer 2 — Logic & Design',        sublabel: 'The architectural layer: silicon design and software IP.',              sectorIds: ['fabless', 'eda'] },
    { id: 'layer-3', label: 'Layer 3 — Production Machinery',  sublabel: 'The machinery layer: the tools that print the circuitry.',             sectorIds: ['wafer_equip'] },
    { id: 'layer-4', label: 'Layer 4 — Fabrication & Memory',  sublabel: 'The manufacturing layer: fabs and vertical silicon giants.',           sectorIds: ['fabs', 'idms'] },
    { id: 'layer-5', label: 'Layer 5 — Deployment & Software', sublabel: 'The application layer: final assembly and end-user monetization.',     sectorIds: ['enterprise_software', 'tech_equipment'] },
  ];
  const sectors: Record<string, StoredSector> = {};
  for (const s of sectorsData.sectors) {
    sectors[s.id] = { id: s.id, name: s.name, description: s.description };
  }
  return { layers, sectors };
}

const LAYOUT: LayoutState = buildSeed();

// ── Utilities ─────────────────────────────────────────────────────────────

function accentFor(sectorId: string, index: number): string {
  return FIXED_ACCENT[sectorId] ?? ACCENT_PALETTE[index % ACCENT_PALETTE.length];
}

function defaultHealth(id: string): SectorHealth {
  return { id, currentMarketCap: '—', currentMarketCapValue: 0, previousMarketCap: '—', qoqChangePercent: 0, dailyChangePercent: 0, ytdChangePercent: 0, forwardPE: 0, netDebt: '—', netDebtValue: 0 };
}

function gridCols(count: number) {
  if (count === 1)
    return 'grid-cols-1 w-full min-w-0 justify-items-center [&>*]:w-full [&>*]:max-w-[700px] [&>*]:min-w-0 [&>*]:mx-auto';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2';
}

const C = {
  border: 'rgba(255,255,255,0.08)',
};

// ── Main component ────────────────────────────────────────────────────────

export default function SupplyChainMap({ editAllowed }: { editAllowed: boolean }) {
  const jsonSectorMap = Object.fromEntries(sectorsData.sectors.map(s => [s.id, s]));

  function sectorForCard(id: string) {
    const stored   = LAYOUT.sectors[id];
    const fromJson = jsonSectorMap[id];
    return {
      id,
      name:        stored?.name        ?? fromJson?.name        ?? id,
      description: stored?.description ?? fromJson?.description ?? '',
      tickers:     fromJson?.tickers   ?? [],
    };
  }

  const allSectorIds = LAYOUT.layers.flatMap(l => l.sectorIds);

  let globalIndex = 0;

  return (
    <TickerFavoritesProvider>
    <div className="w-full space-y-1">
      {LAYOUT.layers.map((layer, layerIdx) => {
        const layerStart = globalIndex;
        globalIndex += layer.sectorIds.length;

        return (
          <div key={layer.id}>
            <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] shrink-0" style={{ color: '#444' }}>
                {layer.label}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
            </div>

            <div className={`grid gap-4 w-full ${gridCols(layer.sectorIds.length)}`}>
              {layer.sectorIds.map((sectorId, cardIdx) => {
                const sector = sectorForCard(sectorId);
                const health = sectorHealthData[sectorId] ?? defaultHealth(sectorId);
                const color  = accentFor(sectorId, allSectorIds.indexOf(sectorId));

                return (
                  <div key={sectorId} className="min-w-0">
                    <SectorCard
                      sector={sector}
                      health={health}
                      accentColor={color}
                      index={layerStart + cardIdx}
                      editAllowed={editAllowed}
                    />
                  </div>
                );
              })}
            </div>

            {layerIdx < LAYOUT.layers.length - 1 && (
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-px h-5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                    <path d="M4 5L0 0h8L4 5z" fill="rgba(255,255,255,0.12)" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </TickerFavoritesProvider>
  );
}
