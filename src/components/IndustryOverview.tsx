'use client';

import { useState } from 'react';
import sectorsData from '@/src/data/sectors.json';
import {
  generateIndustryTimeSeries,
  OVERVIEW_TIME_FRAMES,
  STACK_ORDER,
  SECTOR_CURRENT,
  INDUSTRY_TOTAL_B,
  INDUSTRY_DAILY_PCT,
  INDUSTRY_YTD_PCT,
  type OverviewTimeFrame,
} from '@/src/data/industryTimeSeries';

// Sector accent colours (matches SupplyChainMap)
const ACCENT: Record<string, string> = {
  base_materials:      '#60a5fa', // blue
  specialty_energy:    '#f59e0b', // amber
  fabless:             '#22c55e', // green
  eda:                 '#a78bfa', // violet
  wafer_equip:         '#06b6d4', // cyan
  fabs:                '#f97316', // orange
  idms:                '#64748b', // slate
  enterprise_software: '#ec4899', // pink
  tech_equipment:      '#818cf8', // indigo
};

const SECTOR_SHORT: Record<string, string> = {
  base_materials:      'Base Mat.',
  specialty_energy:    'Spec. Energy',
  fabless:             'Fabless',
  eda:                 'EDA',
  wafer_equip:         'Wafer Equip.',
  fabs:                'Foundries',
  idms:                'IDMs',
  enterprise_software: 'Ent. Software',
  tech_equipment:      'Tech Equip.',
};

const RH = {
  card:    '#131313',
  border:  'rgba(255,255,255,0.06)',
  text:    '#ffffff',
  secondary: '#8a8a8a',
  muted:   '#666666',
  green:   '#22c55e',
  red:     '#ff4436',
  grid:    'rgba(255,255,255,0.04)',
  axis:    '#444444',
};

function fmtTotal(b: number): string {
  return `$${(b / 1000).toFixed(2)}T`;
}

function fmtB(b: number): string {
  if (b >= 1000) return `$${(b / 1000).toFixed(1)}T`;
  return `$${b.toFixed(0)}B`;
}

// ── Stacked bar chart (SVG) ───────────────────────────────────────────────────

const ML = 58, MR = 10, MT = 14, MB = 26;
const TW = 900, TH = 240;
const CW = TW - ML - MR, CH = TH - MT - MB;

interface ChartProps {
  tf: OverviewTimeFrame;
  hoveredSector: string | null;
  onHoverSector: (id: string | null) => void;
}

function StackedBarChart({ tf, hoveredSector, onHoverSector }: ChartProps) {
  const data = generateIndustryTimeSeries(tf);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const totals = data.map(pt => STACK_ORDER.reduce((s, id) => s + pt.values[id], 0));
  const maxTotal = Math.max(...totals);
  const yPad = maxTotal * 0.08;
  const yMax = maxTotal + yPad;

  const toY = (v: number) => MT + (1 - v / yMax) * CH;
  const barW = Math.min(40, (CW / data.length) * 0.55);
  const barStep = CW / data.length;

  const yTicks = [0, 1, 2, 3].map(i => (i / 3) * maxTotal);

  return (
    <svg
      viewBox={`0 0 ${TW} ${TH}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: TH, display: 'block' }}
    >
      {/* Y-axis grid + labels */}
      {yTicks.map((tick, i) => {
        const y = toY(tick);
        return (
          <g key={i}>
            <line x1={ML} y1={y} x2={TW - MR} y2={y}
              stroke={RH.grid} strokeWidth="0.5"
              strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={ML - 6} y={y + 3.5} textAnchor="end"
              fill={RH.axis} fontSize="11"
              fontFamily="'Geist Mono','Courier New',monospace">
              {fmtB(tick)}
            </text>
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line x1={ML} y1={MT + CH} x2={TW - MR} y2={MT + CH}
        stroke={RH.grid} strokeWidth="0.5" />

      {/* Bars */}
      {data.map((pt, barIdx) => {
        const cx       = ML + barIdx * barStep + barStep / 2;
        const x        = cx - barW / 2;
        const isBarHov = hoveredBar === barIdx;
        const anyBarHov = hoveredBar !== null;
        const anySecHov = hoveredSector !== null;
        let cumY = MT + CH;

        const segments = STACK_ORDER.map(id => {
          const val  = pt.values[id];
          const segH = (val / yMax) * CH;
          const segY = cumY - segH;
          cumY = segY;
          return { id, val, segY, segH };
        });

        // Bar-top Y for pill positioning
        const barTopY = segments[segments.length - 1].segY;

        return (
          // Group-level mouse events handle bar hover (mouseleave doesn't fire
          // when moving between children, only on true group exit)
          <g
            key={barIdx}
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHoveredBar(barIdx)}
            onMouseLeave={() => { setHoveredBar(null); onHoverSector(null); }}
          >
            {/* Subtle column background on bar hover */}
            {isBarHov && (
              <rect
                x={cx - barStep * 0.45} y={MT}
                width={barStep * 0.9} height={CH}
                fill="rgba(255,255,255,0.03)"
                rx={3}
              />
            )}

            {segments.map(({ id, segY, segH }, si) => {
              const isMatch = hoveredSector === id;
              let segOpacity: number;
              if (anySecHov)       segOpacity = isMatch ? 1 : 0.15;
              else if (anyBarHov)  segOpacity = isBarHov ? 0.95 : 0.5;
              else                 segOpacity = 0.75;
              const ry = Math.round(segY * 1e4) / 1e4;
              const rh = Math.round(Math.max(0, segH) * 1e4) / 1e4;
              return (
                <rect
                  key={id}
                  x={x} y={ry}
                  width={barW} height={rh}
                  fill={ACCENT[id]}
                  opacity={segOpacity}
                  rx={si === segments.length - 1 ? 2 : 0}
                  style={{ transition: 'opacity 120ms ease' }}
                  onMouseEnter={() => onHoverSector(id)}
                  onMouseLeave={() => onHoverSector(null)}
                />
              );
            })}

            {/* X-axis label — highlights white on bar hover */}
            <text x={cx} y={TH - 5} textAnchor="middle"
              fill={isBarHov ? '#ccc' : '#777'} fontSize="11"
              fontWeight={isBarHov ? '600' : '400'}
              style={{ transition: 'fill 120ms ease' }}
              fontFamily="'Geist Mono','Courier New',monospace">
              {pt.label}
            </text>

            {/* Value pill above bar — sector-specific when hovering a segment */}
            {isBarHov && (() => {
              const pY = Math.max(MT + 2, barTopY - 36);

              if (hoveredSector) {
                // Segment-specific pill: sector name + its value in this period
                const segColor = ACCENT[hoveredSector];
                const segShort = SECTOR_SHORT[hoveredSector];
                const segVal   = fmtB(pt.values[hoveredSector]);
                const pW = Math.max((segShort.length + segVal.length) * 6.2 + 24, 90);
                const pX = Math.min(Math.max(cx - pW / 2, ML), TW - MR - pW);
                return (
                  <g>
                    <rect x={pX} y={pY} width={pW} height={30} rx="4"
                      fill="#1a1a1a" stroke={segColor} strokeWidth="0.8" strokeOpacity="0.7" />
                    <text x={pX + pW / 2} y={pY + 11} textAnchor="middle"
                      fill={RH.muted} fontSize="12"
                      fontFamily="'Geist Mono','Courier New',monospace">
                      {segShort}
                    </text>
                    <text x={pX + pW / 2} y={pY + 23} textAnchor="middle"
                      fill={segColor} fontSize="12" fontWeight="700"
                      fontFamily="'Geist Mono','Courier New',monospace">
                      {segVal}
                    </text>
                  </g>
                );
              }

              // Total pill fallback
              const totalVal = fmtB(totals[barIdx]);
              const pW = Math.max(totalVal.length * 7 + 16, 52);
              const pX = Math.min(Math.max(cx - pW / 2, ML), TW - MR - pW);
              return (
                <g>
                  <rect x={pX} y={pY} width={pW} height={18} rx="4"
                    fill="#1e1e1e" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
                  <text x={pX + pW / 2} y={pY + 12.5} textAnchor="middle"
                    fill="#fff" fontSize="11.5" fontWeight="700"
                    fontFamily="'Geist Mono','Courier New',monospace">
                    {totalVal}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

// ── Allocation bar ────────────────────────────────────────────────────────────

interface AllocProps {
  hoveredSector: string | null;
  onHoverSector: (id: string | null) => void;
}

function AllocationBar({ hoveredSector, onHoverSector }: AllocProps) {
  const total = INDUSTRY_TOTAL_B;

  // Pre-compute cumulative midpoints for tooltip positioning
  let cumPct = 0;
  const segments = STACK_ORDER.map(id => {
    const pct    = (SECTOR_CURRENT[id] / total) * 100;
    const midPct = cumPct + pct / 2;
    cumPct += pct;
    return { id, pct, midPct };
  });

  const active = hoveredSector ? segments.find(s => s.id === hoveredSector) : null;

  return (
    <div className="relative">
      {/* Tooltip */}
      {active && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none z-10"
          style={{ left: `${active.midPct}%`, transform: 'translateX(-50%)' }}
        >
          <div style={{
            backgroundColor: '#1a1a1a',
            border: `1px solid ${ACCENT[active.id]}`,
            borderRadius: 5,
            padding: '5px 10px',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ color: RH.muted, fontSize: 9, fontFamily: "'Geist Mono','Courier New',monospace", marginBottom: 2 }}>
              {SECTOR_SHORT[active.id]}
            </div>
            <div style={{ color: ACCENT[active.id], fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono','Courier New',monospace" }}>
              {active.pct.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Bar */}
      <div className="flex w-full rounded overflow-hidden" style={{ height: 6 }}>
        {segments.map(({ id, pct }) => {
          const anyHov = hoveredSector !== null;
          const isMatch = hoveredSector === id;
          return (
            <div
              key={id}
              style={{
                width: `${pct}%`,
                backgroundColor: ACCENT[id],
                opacity: anyHov ? (isMatch ? 1 : 0.2) : 0.8,
                transition: 'opacity 120ms ease',
                cursor: 'default',
              }}
              onMouseEnter={() => onHoverSector(id)}
              onMouseLeave={() => onHoverSector(null)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

interface LegendProps {
  hoveredSector: string | null;
  onHoverSector: (id: string | null) => void;
}

function Legend({ hoveredSector, onHoverSector }: LegendProps) {
  const total = INDUSTRY_TOTAL_B;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {STACK_ORDER.map(id => {
        const anyHov = hoveredSector !== null;
        const isMatch = hoveredSector === id;
        return (
          <div
            key={id}
            className="flex items-center gap-1.5"
            style={{
              opacity: anyHov ? (isMatch ? 1 : 0.3) : 1,
              transition: 'opacity 120ms ease',
              cursor: 'default',
            }}
            onMouseEnter={() => onHoverSector(id)}
            onMouseLeave={() => onHoverSector(null)}
          >
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: ACCENT[id] }} />
            <span className="text-[12px]" style={{ color: isMatch ? '#fff' : RH.secondary }}>
              {SECTOR_SHORT[id]}
            </span>
            <span className="text-[12px] font-mono" style={{ color: isMatch ? RH.secondary : RH.muted }}>
              {((SECTOR_CURRENT[id] / total) * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IndustryOverview() {
  const [tf, setTf] = useState<OverviewTimeFrame>('3Y');
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  return (
    <div
      className="mb-8 overflow-hidden"
      style={{
        backgroundColor: RH.card,
        border: `1px solid ${RH.border}`,
        borderRadius: 10,
      }}
    >
      {/* ── Header row ───────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 flex flex-wrap items-end gap-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Total market cap */}
        <div>
          <p className="text-[13px] uppercase tracking-widest mb-1" style={{ color: RH.muted }}>
            AI Infrastructure — Total Market Cap
          </p>
          <p className="text-4xl font-bold tabular-nums" style={{ color: RH.text }}>
            {fmtTotal(INDUSTRY_TOTAL_B)}
          </p>
        </div>

        {/* Deltas + counts + macro signals — all on one line */}
        <div className="flex gap-5 pb-0.5 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] uppercase tracking-widest" style={{ color: RH.muted }}>Daily</span>
            <span className="text-base font-semibold tabular-nums" style={{ color: RH.green }}>
              ▲ {INDUSTRY_DAILY_PCT.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] uppercase tracking-widest" style={{ color: RH.muted }}>YTD</span>
            <span className="text-base font-semibold tabular-nums" style={{ color: RH.green }}>
              ▲ {INDUSTRY_YTD_PCT.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] uppercase tracking-widest" style={{ color: RH.muted }}>Sectors</span>
            <span className="text-base font-semibold tabular-nums" style={{ color: RH.secondary }}>
              {sectorsData.sectors.length}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] uppercase tracking-widest" style={{ color: RH.muted }}>Tickers</span>
            <span className="text-base font-semibold tabular-nums" style={{ color: RH.secondary }}>
              {sectorsData.sectors.reduce((n, s) => n + s.tickers.length, 0)}
            </span>
          </div>

          <div className="self-stretch w-px" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

          {[
            { label: 'CapEx Momentum',  value: '$3.2T',  delta: '+12%',    unit: 'YoY' },
            { label: 'Cur. Capacity',   value: '115 GW', delta: '+12%',    unit: 'YoY' },
            { label: 'Global Pipeline', value: '100 GW', delta: 'by 2030', unit: '' },
          ].map(({ label, value, delta, unit }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[13px] uppercase tracking-widest whitespace-nowrap" style={{ color: RH.muted }}>
                {label}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold tabular-nums" style={{ color: RH.secondary }}>
                  {value}
                </span>
                <span className="text-[13px] font-mono tabular-nums" style={{ color: RH.green }}>
                  {delta.startsWith('+') ? `▲ ${delta}` : delta}{unit ? ` ${unit}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Allocation bar ───────────────────────────────── */}
      <div className="px-6 pt-4 pb-3">
        <p className="text-[13px] uppercase tracking-widest mb-2" style={{ color: RH.muted }}>
          Allocation by Sector
        </p>
        <AllocationBar hoveredSector={hoveredSector} onHoverSector={setHoveredSector} />
      </div>

      {/* ── Chart ────────────────────────────────────────── */}
      <div className="px-6 pt-3 pb-1">
        <StackedBarChart tf={tf} hoveredSector={hoveredSector} onHoverSector={setHoveredSector} />
      </div>

      {/* ── Controls row ─────────────────────────────────── */}
      <div className="px-6 pb-5 flex items-center justify-between flex-wrap gap-3">
        {/* Time frames */}
        <div className="flex gap-0.5">
          {OVERVIEW_TIME_FRAMES.map(t => {
            const on = t === tf;
            return (
              <button
                key={t}
                onClick={() => setTf(t)}
                className="text-[13px] font-semibold px-2.5 py-1 rounded transition-all duration-100 cursor-pointer"
                style={{
                  backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: on ? RH.text : RH.muted,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <Legend hoveredSector={hoveredSector} onHoverSector={setHoveredSector} />
      </div>
    </div>
  );
}
