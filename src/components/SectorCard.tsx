'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SectorHealth } from '@/src/data/sectorHealth';
import { generateChartData, getXAxisLabels, TIME_FRAMES, type TimeFrame } from '@/src/data/chartData';
import { SECTOR_ICONS } from '@/src/components/SectorIcon';
import { tickerData, type TickerData } from '@/src/data/tickerData';
import { loadFavoriteTickers, saveFavoriteTickers } from '@/src/lib/tickerFavorites';

// ── Design tokens (Robinhood Legend) ─────────────────────────────────────────
const RH = {
  card:         '#131313',
  border:       'rgba(255,255,255,0.06)',
  borderActive: 'rgba(255,255,255,0.16)',
  neon:         '#b1ff56',   // Robin Neon — active state highlight
  green:        '#22c55e',   // positive metric
  red:          '#ff4436',   // negative metric
  text:         '#ffffff',
  secondary:    '#8a8a8a',
  muted:        '#666666',
  chartBg:      '#0a0a0a',
  chartGrid:    'rgba(255,255,255,0.04)',
  chartAxis:    '#444444',
} as const;

/**
 * Metrics-bar % should match FMP / broker convention (split-adjusted, calendar periods).
 * Chart first→last can drift (series start, gaps). Fall back to chart for 1W / All.
 */
function periodPercentForBar(
  q: TickerData | null | undefined,
  tf: TimeFrame,
  chartFallback: number | null,
): number | null {
  if (!q) return chartFallback;
  const pc = q.periodChanges;
  const pick = (v: number | undefined | null): number | null =>
    v != null && Number.isFinite(v) ? v : null;

  if (pc) {
    switch (tf) {
      case '1D':
        return pick(pc['1D']) ?? pick(q.dailyChangePercent);
      case '1W':
        break;
      case '1M':
        return pick(pc['1M']);
      case '3M':
        return pick(pc['3M']);
      case 'YTD':
        return pick(pc.ytd) ?? pick(q.ytdChangePercent);
      case '1Y':
        return pick(pc['1Y']) ?? pick(q.ttmChangePercent);
      case '5Y':
        return pick(pc['5Y']);
      case 'All':
        break;
      default:
        break;
    }
  }
  switch (tf) {
    case 'YTD':
      return pick(q.ytdChangePercent) ?? chartFallback;
    case '1Y':
      return pick(q.ttmChangePercent) ?? chartFallback;
    case '1D':
      return pick(q.dailyChangePercent) ?? chartFallback;
    default:
      break;
  }
  return chartFallback;
}

interface TickerEntry {
  symbol: string;
  desc: string;
}

interface Sector {
  id: string;
  name: string;
  tickers: TickerEntry[];
  description: string;
}

interface SectorCardProps {
  sector: Sector;
  health: SectorHealth;
  accentColor: string;
  index: number;
  /** When false, hide add/remove ticker (set from server via EDIT_ACCESS_SECRET session). */
  editAllowed: boolean;
}

// ── Indicator types & math helpers ──────────────────────────────────────────

type Indicator = 'bb' | 'vol' | 'rsi';

function computeBB(data: number[], period = 20) {
  const p = Math.max(4, Math.min(period, Math.floor(data.length * 0.6)));
  const mid: number[] = [], upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < p - 1) { mid.push(NaN); upper.push(NaN); lower.push(NaN); continue; }
    const s    = data.slice(i - p + 1, i + 1);
    const mean = s.reduce((a, b) => a + b, 0) / p;
    const std  = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / p);
    mid.push(mean); upper.push(mean + 2 * std); lower.push(mean - 2 * std);
  }
  return { mid, upper, lower };
}

function computeRSI(data: number[], period = 14) {
  const p   = Math.max(4, Math.min(period, Math.floor(data.length * 0.5)));
  const out: number[] = new Array(data.length).fill(NaN);
  if (data.length < p + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= p; i++) {
    const d = data[i] - data[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= p; al /= p;
  out[p] = 100 - 100 / (1 + ag / (al || 1e-9));
  for (let i = p + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    ag = (ag * (p - 1) + Math.max(0, d)) / p;
    al = (al * (p - 1) + Math.max(0, -d)) / p;
    out[i] = 100 - 100 / (1 + ag / (al || 1e-9));
  }
  return out;
}

const VOL_BARS = 80; // independent high-density volume bars

function fakeVolumeDense(values: number[], count: number): { v: number; up: boolean }[] {
  return Array.from({ length: count }, (_, i) => {
    const t     = i / Math.max(count - 1, 1);
    const pi    = t * (values.length - 1);
    const lo    = Math.floor(pi), hi = Math.min(Math.ceil(pi), values.length - 1);
    const price = values[lo] * (1 - (pi - lo)) + values[hi] * (pi - lo);
    const prevT  = (i - 1) / Math.max(count - 1, 1);
    const prevPi = Math.max(0, prevT * (values.length - 1));
    const prevLo = Math.floor(prevPi);
    const prevPrice = values[Math.max(0, prevLo)];
    const chg    = Math.abs(price - prevPrice) / (prevPrice || 1);
    const base   = 0.35 + 0.65 * Math.abs(Math.sin(i * 7.3 + 1.1));
    return { v: (1 + chg * 10) * base, up: price >= prevPrice };
  });
}

function svgLinePath(
  ys: number[],
  toX: (i: number) => number,
  toY: (v: number) => number,
): string {
  let path = '', prev = false;
  for (let i = 0; i < ys.length; i++) {
    if (!isFinite(ys[i])) { prev = false; continue; }
    path += `${prev ? 'L' : 'M'} ${toX(i).toFixed(1)} ${toY(ys[i]).toFixed(1)} `;
    prev = true;
  }
  return path;
}

// ── Line chart ────────────────────────────────────────────────────────────────

const ML = 50, MR = 8, MT = 10;
const TW = 600;
const MAIN_CH = 170; // main chart draw height
const VOL_H   = 52;  // volume sub-panel
const RSI_H   = 64;  // RSI sub-panel
const X_H     = 26;  // x-axis label area
const SEP     = 10;  // gap between panels

function fmtY(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 2000 ? 1 : 2)}T`;
  if (v >= 100)  return `$${v.toFixed(0)}B`;
  if (v >= 10)   return `$${v.toFixed(1)}B`;
  return `$${v.toFixed(2)}B`;
}

/** Format a raw ISO date/datetime string into a human-readable hover label. */
function formatHoverDate(dateStr: string, tf?: TimeFrame): string {
  if (dateStr.includes(' ')) {
    // Intraday: "2026-05-06 14:30:00" → "2:30 PM"
    const [, time] = dateStr.split(' ');
    const [h, m]   = time.split(':').map(Number);
    const suffix   = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  const dt  = new Date(dateStr + 'T12:00:00');
  const mon = dt.toLocaleString('en-US', { month: 'short' });
  const day = dt.getDate();
  const yr  = `'${dt.getFullYear().toString().slice(2)}`;

  if (tf === '5Y' || tf === 'All') return `${mon} ${yr}`;          // "May '26"
  if (tf === '1Y')                 return `${mon} ${day} ${yr}`;   // "May 7 '25"
  // 1W, 1M, 3M, YTD → specific date, year implied
  return `${mon} ${day}`;                                           // "May 7"
}

function LineChart({ values, labels, dates, color, id, indicators, yFmt: yFmtProp, timeFrame }: {
  values: number[];
  labels: string[];
  dates?: string[];   // raw ISO strings for precise hover date formatting
  color: string;
  id: string;
  indicators: Set<Indicator>;
  yFmt?: (v: number) => string;
  timeFrame?: TimeFrame;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const fmt = yFmtProp ?? fmtY;

  if (!values.length) return null;

  const showBB  = indicators.has('bb');
  const showVol = indicators.has('vol');
  const showRSI = indicators.has('rsi');

  // Dynamic SVG height
  const svgH  = MT + MAIN_CH
    + (showVol ? SEP + VOL_H : 0)
    + (showRSI ? SEP + RSI_H : 0)
    + X_H;
  const CW    = TW - ML - MR;
  const baseY = MT + MAIN_CH;
  const volY0 = baseY + SEP;
  const rsiY0 = (showVol ? volY0 + VOL_H : baseY) + SEP;

  // ── Memoize all stable computations — re-runs only when data/indicators change,
  //    NOT on every hover mouse-move re-render
  const stable = useMemo(() => {
    const bb = showBB ? computeBB(values) : null;

    const allMainY = [...values, ...(bb ? [...bb.upper, ...bb.lower].filter(isFinite) : [])];
    const rawMin   = Math.min(...allMainY);
    const rawMax   = Math.max(...allMainY);
    const pad      = (rawMax - rawMin) * 0.14 || rawMax * 0.05;
    const yMin     = rawMin - pad;
    const yRange   = (rawMax + pad) - yMin;

    const toY = (v: number) => MT + (1 - (v - yMin) / yRange) * MAIN_CH;
    const toX = (i: number) => ML + (i / Math.max(values.length - 1, 1)) * CW;

    const linePath = svgLinePath(values, toX, toY);
    const lastX    = toX(values.length - 1);
    const lastY    = toY(values[values.length - 1]);
    const areaPath = `${linePath} L ${lastX.toFixed(1)} ${baseY} L ${toX(0).toFixed(1)} ${baseY} Z`;

    const bbMidPath = bb ? svgLinePath(bb.mid,   toX, toY) : '';
    const bbUpPath  = bb ? svgLinePath(bb.upper, toX, toY) : '';
    const bbLowPath = bb ? svgLinePath(bb.lower, toX, toY) : '';
    let bbFillPath = '';
    if (bb) {
      const fwd: string[] = [], bk: string[] = [];
      for (let i = 0; i < bb.upper.length; i++)
        if (isFinite(bb.upper[i]))
          fwd.push(`${fwd.length === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(bb.upper[i]).toFixed(1)}`);
      for (let i = bb.lower.length - 1; i >= 0; i--)
        if (isFinite(bb.lower[i]))
          bk.push(`L ${toX(i).toFixed(1)} ${toY(bb.lower[i]).toFixed(1)}`);
      if (fwd.length && bk.length) bbFillPath = [...fwd, ...bk, 'Z'].join(' ');
    }

    const volBars = showVol ? fakeVolumeDense(values, VOL_BARS) : [];
    const volMax  = volBars.length ? Math.max(...volBars.map(b => b.v)) * 1.1 : 1;
    const rsiData = showRSI ? computeRSI(values) : [] as number[];

    const yTicks  = [0, 1, 2, 3].map(i => yMin + (i / 3) * yRange);
    const xLabels = labels.map((lbl, i) => ({ lbl, x: toX(i) })).filter(l => l.lbl);

    return {
      bb, yMin, yRange, toX, toY, lastX, lastY,
      linePath, areaPath, bbMidPath, bbUpPath, bbLowPath, bbFillPath,
      volBars, volMax, rsiData, yTicks, xLabels,
    };
  }, [values, labels, showBB, showVol, showRSI, baseY]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    bb, yMin, yRange, toX, toY, lastX, lastY,
    linePath, areaPath, bbMidPath, bbUpPath, bbLowPath, bbFillPath,
    volBars, volMax, rsiData, yTicks, xLabels,
  } = stable;

  const toVolY = (v: number) => volY0 + VOL_H - (v / volMax) * VOL_H * 0.85;
  const toRsiY = (v: number) => rsiY0 + (1 - v / 100) * RSI_H;
  const gradId = `lcg-${id}`;

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX  = (e.clientX - rect.left) / rect.width;
    const svgX  = relX * TW;
    const idx   = Math.round((svgX - ML) / CW * (values.length - 1));
    setHoverIdx(Math.max(0, Math.min(values.length - 1, idx)));
  };

  const hx    = hoverIdx !== null ? toX(hoverIdx) : null;
  const hy    = hoverIdx !== null ? toY(values[hoverIdx]) : null;
  const hVal  = hoverIdx !== null ? fmt(values[hoverIdx]) : null;
  // Hover date: use raw date string when available for precise formatting per timeframe,
  // otherwise fall back to nearest non-empty label from the labels array
  const hDate = hoverIdx !== null ? (() => {
    if (dates?.[hoverIdx]) return formatHoverDate(dates[hoverIdx], timeFrame);
    if (labels[hoverIdx]) return labels[hoverIdx];
    for (let d = 1; d < labels.length; d++) {
      if (hoverIdx - d >= 0 && labels[hoverIdx - d]) return labels[hoverIdx - d];
      if (hoverIdx + d < labels.length && labels[hoverIdx + d]) return labels[hoverIdx + d];
    }
    return '';
  })() : '';
  const pillW = hVal ? Math.max(hVal.length * 7 + 16, 60) : 60;
  const pillX = hx !== null ? Math.min(Math.max(hx - pillW / 2, ML), TW - MR - pillW) : 0;
  const pillY = hy !== null ? (hy - 28 < MT + 4 ? hy + 8 : hy - 28) : 0;

  return (
    <svg
      viewBox={`0 0 ${TW} ${svgH}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: svgH, display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* ── Main chart: grid + axes ─────────────────────── */}
      {yTicks.map((tick, i) => {
        const y = toY(tick);
        return (
          <g key={i}>
            <line x1={ML} y1={y} x2={TW - MR} y2={y}
              stroke={RH.chartGrid} strokeWidth="0.5"
              strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={ML - 5} y={y + 3.5} textAnchor="end"
              fill={RH.chartAxis} fontSize="10.5"
              fontFamily="'Geist Mono','Courier New',monospace">
              {fmt(tick)}
            </text>
          </g>
        );
      })}
      <line x1={ML} y1={baseY} x2={TW - MR} y2={baseY} stroke={RH.chartGrid} strokeWidth="0.5" />

      {/* BB indicator label */}
      {showBB && (
        <text x={TW - MR - 3} y={MT + 9} textAnchor="end"
          fill={color} fillOpacity="0.5" fontSize="11.5"
          fontFamily="'Geist Mono','Courier New',monospace">
          BB 20
        </text>
      )}

      {/* ── Bollinger Bands (overlay) ───────────────────── */}
      {bb && bbFillPath && (
        <path d={bbFillPath} fill={color} fillOpacity="0.07" />
      )}
      {bb && (
        <>
          <path d={bbUpPath}  fill="none" stroke={color} strokeWidth="0.85" strokeOpacity="0.38" strokeDasharray="3 3" />
          <path d={bbMidPath} fill="none" stroke={color} strokeWidth="0.85" strokeOpacity="0.5"  strokeDasharray="5 4" />
          <path d={bbLowPath} fill="none" stroke={color} strokeWidth="0.85" strokeOpacity="0.38" strokeDasharray="3 3" />
        </>
      )}

      {/* ── Price area + line ───────────────────────────── */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {hoverIdx === null && (
        <>
          <line x1={ML} y1={lastY} x2={TW - MR} y2={lastY}
            stroke={color} strokeWidth="0.4" strokeDasharray="2 3" opacity="0.3" />
          <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
        </>
      )}

      {/* ── Volume sub-panel ────────────────────────────── */}
      {showVol && (
        <g>
          <line x1={ML} y1={volY0} x2={TW - MR} y2={volY0}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <text x={TW - MR - 3} y={volY0 + 9} textAnchor="end"
            fill={RH.chartAxis} fontSize="11.5"
            fontFamily="'Geist Mono','Courier New',monospace">
            VOL
          </text>
          {volBars.map(({ v, up }, i) => {
            const bx = ML + (i / (VOL_BARS - 1)) * CW;
            const by = toVolY(v);
            const bh = Math.max(1, (volY0 + VOL_H) - by);
            const bw = Math.max(1, CW / VOL_BARS * 0.55);
            return (
              <rect key={i} x={bx - bw / 2} y={by} width={bw} height={bh}
                fill={up ? RH.green : RH.red} fillOpacity="0.6" />
            );
          })}
          <line x1={ML} y1={volY0 + VOL_H} x2={TW - MR} y2={volY0 + VOL_H}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        </g>
      )}

      {/* ── RSI sub-panel ───────────────────────────────── */}
      {showRSI && (
        <g>
          <line x1={ML} y1={rsiY0} x2={TW - MR} y2={rsiY0}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <text x={TW - MR - 3} y={rsiY0 + 9} textAnchor="end"
            fill={RH.chartAxis} fontSize="11.5"
            fontFamily="'Geist Mono','Courier New',monospace">
            RSI 14
          </text>
          {/* Reference lines: 70 (overbought), 50 (mid), 30 (oversold) */}
          {([70, 50, 30] as const).map(lvl => {
            const ly = toRsiY(lvl);
            return (
              <g key={lvl}>
                <line x1={ML} y1={ly} x2={TW - MR} y2={ly}
                  stroke={lvl === 50
                    ? 'rgba(255,255,255,0.06)'
                    : lvl === 70 ? `${RH.red}55` : `${RH.green}55`}
                  strokeWidth="0.5" strokeDasharray={lvl === 50 ? undefined : '3 4'} />
                <text x={ML - 4} y={ly + 3.5} textAnchor="end"
                  fill={RH.chartAxis} fontSize="11.5"
                  fontFamily="'Geist Mono','Courier New',monospace">
                  {lvl}
                </text>
              </g>
            );
          })}
          {/* RSI line */}
          <path d={svgLinePath(rsiData, toX, toRsiY)} fill="none"
            stroke="#a855f7" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={ML} y1={rsiY0 + RSI_H} x2={TW - MR} y2={rsiY0 + RSI_H}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        </g>
      )}

      {/* ── X-axis labels — fade when hovering ──────────── */}
      {xLabels.map(({ lbl, x }, i) => (
        <text key={i} x={x} y={svgH - 4} textAnchor="middle"
          fill={RH.chartAxis} fontSize="10.5"
          fontFamily="'Geist Mono','Courier New',monospace"
          opacity={hoverIdx !== null ? 0 : 1}
          style={{ transition: 'opacity 80ms' }}>
          {lbl}
        </text>
      ))}

      {/* ── Hover crosshair (spans all panels) ──────────── */}
      {hoverIdx !== null && hx !== null && hy !== null && hVal !== null && (
        <g>
          {/* Solid thin tracking line */}
          <line x1={hx} y1={MT} x2={hx} y2={svgH - X_H}
            stroke={RH.chartAxis} strokeWidth="0.6" opacity="0.5" />

          <circle cx={hx} cy={hy} r="5.5" fill={color} fillOpacity="0.18" />
          <circle cx={hx} cy={hy} r="3"   fill={color} />

          <rect x={pillX} y={pillY} width={pillW} height={18} rx="1"
            fill="#1a1a1a" stroke={color} strokeWidth="0.7" strokeOpacity="0.7" />
          <text x={pillX + pillW / 2} y={pillY + 12.5} textAnchor="middle"
            fill={color} fontSize="11.5" fontWeight="700"
            fontFamily="'Geist Mono','Courier New',monospace">
            {hVal}
          </text>

          {/* RSI hover dot + value */}
          {showRSI && isFinite(rsiData[hoverIdx]) && (() => {
            const ry    = toRsiY(rsiData[hoverIdx]);
            const rpx   = Math.min(Math.max(hx - 18, ML), TW - MR - 36);
            const rpy   = rsiY0 + RSI_H - 14;
            return (
              <>
                <circle cx={hx} cy={ry} r="2.5" fill="#a855f7" />
                <rect x={rpx} y={rpy} width={36} height={12} rx="1"
                  fill="#110d18" stroke="#a855f766" strokeWidth="0.7" />
                <text x={rpx + 18} y={rpy + 9} textAnchor="middle"
                  fill="#a855f7" fontSize="10" fontWeight="600"
                  fontFamily="'Geist Mono','Courier New',monospace">
                  {rsiData[hoverIdx].toFixed(1)}
                </text>
              </>
            );
          })()}

          {/* Date label on x-axis at crosshair position */}
          {hDate && (
            <text x={hx} y={svgH - 4} textAnchor="middle"
              fill={RH.secondary} fontSize="10.5"
              fontFamily="'Geist Mono','Courier New',monospace">
              {hDate}
            </text>
          )}
        </g>
      )}

      {/* Invisible overlay for mouse events */}
      <rect x={ML} y={MT} width={CW} height={svgH - MT}
        fill="transparent" style={{ cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      />
    </svg>
  );
}

// ── Mini 7-day sparkline ─────────────────────────────────────────────────────

function MiniSparkline({ sym, price, liveValues }: { sym: string; price: number; liveValues?: number[] }) {
  // Use real EOD prices when available; fall back to deterministic mock
  const values = (liveValues && liveValues.length >= 2) ? liveValues : generateChartData(`spark-${sym}`, price, '1W');
  if (!values.length) return <div style={{ width: 64 }} />;
  const W = 64, H = 16;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || max * 0.05;
  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - 1 - ((v - min) / range) * (H - 2);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={path} fill="none"
        stroke={isUp ? '#22c55e' : '#ff4436'}
        strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Ticker table ──────────────────────────────────────────────────────────────

type PeMode = 'fwd' | 'ttm';

const fmtPrice = (p: number) =>
  p >= 100 ? `$${p.toFixed(2)}` : p >= 10 ? `$${p.toFixed(2)}` : `$${p.toFixed(2)}`;

const fmtPct = (p: number) => `${p >= 0 ? '+' : '-'}${Math.abs(p).toFixed(1)}%`;

function TickerTable({
  tickers,
  activeTicker,
  peMode,
  liveQuotes,
  sparklines,
  onSelect,
  onTogglePE,
  onAdd,
  onRemove,
  editAllowed,
}: {
  tickers: TickerEntry[];
  activeTicker: string | null;
  peMode: PeMode;
  liveQuotes: Record<string, TickerData>;
  sparklines: Record<string, number[]>;
  onSelect: (sym: string) => void;
  onTogglePE: () => void;
  onAdd: (sym: string) => void;
  onRemove: (sym: string) => void;
  editAllowed: boolean;
}) {
  const [adding, setAdding]         = useState(false);
  const [inputVal, setInputVal]     = useState('');
  const [inputError, setInputError] = useState('');
  const [capSort, setCapSort]       = useState<'desc' | 'asc' | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [favorites, setFavorites]   = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(loadFavoriteTickers());
  }, []);

  const toggleFavorite = useCallback((sym: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      saveFavoriteTickers(next);
      return next;
    });
  }, []);

  const sortedTickers = useMemo(() => {
    const order = new Map(tickers.map((t, i) => [t.symbol, i]));
    const cap = (sym: string) => (liveQuotes[sym] ?? tickerData[sym])?.marketCapValue ?? 0;

    return [...tickers].sort((a, b) => {
      const aF = favorites.has(a.symbol);
      const bF = favorites.has(b.symbol);
      if (aF !== bF) return aF ? -1 : 1;

      if (capSort) {
        const ca = cap(a.symbol);
        const cb = cap(b.symbol);
        if (ca !== cb) return capSort === 'desc' ? cb - ca : ca - cb;
      }
      return (order.get(a.symbol) ?? 0) - (order.get(b.symbol) ?? 0);
    });
  }, [tickers, liveQuotes, capSort, favorites]);

  const handleCapSort = () =>
    setCapSort(prev => prev === 'desc' ? 'asc' : 'desc');

  const handleSubmit = () => {
    const sym = inputVal.trim().toUpperCase();
    if (!sym) { setAdding(false); setInputVal(''); return; }
    if (tickers.some(t => t.symbol === sym)) {
      setInputError('Already in list'); setTimeout(() => setInputError(''), 1800); return;
    }
    onAdd(sym);
    setInputVal('');
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setAdding(false); setInputVal(''); setInputError(''); }
  };

  // cols: ★ | sym | price | spark | mkt cap | pe | ytd | 1y | debt | remove
  const COLS = editAllowed
    ? '22px 0.9fr 1fr 1.4fr 1.1fr 0.9fr 0.9fr 0.9fr 1.1fr 18px'
    : '22px 0.9fr 1fr 1.4fr 1.1fr 0.9fr 0.9fr 0.9fr 1.1fr';
  const GAP  = '0 8px';
  const VAL  = 'text-[13px] font-mono tabular-nums leading-none';

  return (
    <div className="mx-5 mb-5 min-w-0 overflow-x-auto">
      <div className="min-w-[720px]">
      {/* Header */}
      <div className="grid items-center mb-0.5 px-2"
        style={{ gridTemplateColumns: COLS, gap: GAP }}>
        <span className="text-[10px] text-center leading-none select-none" title="Favorite"
          style={{ color: RH.muted, opacity: 0.45 }}>★</span>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>Sym</span>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>Price</span>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>7D</span>
        <button onClick={handleCapSort}
          className="flex items-center gap-0.5 cursor-pointer"
          style={{ color: capSort ? RH.secondary : RH.muted }}
          title="Sort by market cap">
          <span className="text-[12px] uppercase tracking-wider">Mkt Cap</span>
          <svg width="6" height="6" viewBox="0 0 8 8" fill="none" style={{ opacity: capSort ? 0.9 : 0.5, flexShrink: 0 }}>
            {capSort === 'asc'
              ? <path d="M2 5l2-4 2 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M2 3l2 4 2-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        </button>
        <button onClick={onTogglePE}
          className="flex items-center gap-0.5 cursor-pointer"
          style={{ color: RH.muted }}
          title="Toggle Fwd / TTM P/E">
          <span className="text-[12px] uppercase tracking-wider">
            {peMode === 'fwd' ? 'Fwd PE' : 'TTM PE'}
          </span>
          <svg width="6" height="6" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
            <path d="M2 3l2-2 2 2M2 5l2 2 2-2" stroke={RH.muted} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>YTD</span>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>1Y</span>
        <span className="text-[12px] uppercase tracking-wider" style={{ color: RH.muted }}>Debt</span>
        {editAllowed ? <span /> : null}
      </div>

      {/* Divider */}
      <div className="mb-0.5" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />

      {/* Rows */}
      {sortedTickers.map(({ symbol: sym, desc }) => {
        // Live data takes priority; fall back to static mock
        const t = liveQuotes[sym] ?? tickerData[sym];
        const isActive = activeTicker === sym;
        const pe = t ? (peMode === 'fwd' ? t.forwardPE : t.ttmPE) : null;

        return (
          <div key={sym}>
            <div
              className="grid items-center px-2 py-[5px] cursor-pointer rounded"
              style={{
                gridTemplateColumns: COLS,
                gap: GAP,
                backgroundColor: isActive ? 'rgba(177,255,86,0.06)' : 'transparent',
                borderLeft: isActive ? '2px solid #b1ff56' : '2px solid transparent',
                transition: 'background-color 100ms',
              }}
              onMouseEnter={() => setHoveredRow(sym)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => onSelect(sym)}
            >
              <button
                type="button"
                className="flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer select-none"
                style={{
                  color:     favorites.has(sym) ? RH.neon : RH.muted,
                  opacity:   favorites.has(sym) ? 1 : 0.38,
                  lineHeight: 1,
                }}
                title={favorites.has(sym) ? `Unfavorite ${sym}` : `Favorite ${sym}`}
                aria-pressed={favorites.has(sym)}
                aria-label={favorites.has(sym) ? `Remove ${sym} from favorites` : `Add ${sym} to favorites`}
                onClick={e => { e.stopPropagation(); toggleFavorite(sym); }}
              >
                <span className="text-[14px] leading-none">★</span>
              </button>
              <span className="text-[13px] font-mono font-bold truncate"
                style={{ color: isActive ? RH.neon : RH.text }}>
                {sym}
              </span>
              <span className={VAL} style={{ color: RH.secondary }}>
                {t ? fmtPrice(t.price) : '—'}
              </span>
              <div className="flex items-center">
                {t ? <MiniSparkline sym={sym} price={t.price} liveValues={sparklines[sym]} /> : null}
              </div>
              <span className={VAL} style={{ color: RH.secondary }}>
                {t ? t.marketCap : '—'}
              </span>
              <span className={VAL} style={{ color: RH.secondary }}>
                {pe != null ? `${pe.toFixed(0)}x` : 'NM'}
              </span>
              <span className={VAL}
                style={{ color: t && t.ytdChangePercent >= 0 ? RH.green : RH.red }}>
                {t ? fmtPct(t.ytdChangePercent) : '—'}
              </span>
              <span className={VAL}
                style={{ color: t && t.ttmChangePercent >= 0 ? RH.green : RH.red }}>
                {t ? fmtPct(t.ttmChangePercent) : '—'}
              </span>
              <span className={VAL}
                style={{ color: t && t.netDebtValue < 0 ? RH.green : RH.secondary }}>
                {t ? t.netDebt : '—'}
              </span>
              {editAllowed ? (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(sym); }}
                  style={{
                    opacity: hoveredRow === sym ? 0.5 : 0,
                    transition: 'opacity 120ms',
                    color: RH.muted,
                    lineHeight: 1,
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                  title={`Remove ${sym}`}
                >✕</button>
              ) : null}
            </div>

            {isActive && desc && (
              <p className="px-2 pb-0.5 text-[13px] leading-relaxed"
                style={{ color: RH.muted, borderLeft: '2px solid #b1ff5630' }}>
                {desc}
              </p>
            )}
          </div>
        );
      })}

      {/* ── Add ticker row ──────────────────────────────── */}
      {editAllowed ? (
      <div className="mt-1 px-2">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={inputVal}
              onChange={e => { setInputVal(e.target.value.toUpperCase()); setInputError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="TICKER"
              maxLength={6}
              className="w-20 bg-transparent font-mono text-[13px] font-bold tracking-wider outline-none placeholder:opacity-30"
              style={{
                color: inputError ? RH.red : RH.text,
                borderBottom: `1px solid ${inputError ? RH.red : 'rgba(255,255,255,0.18)'}`,
                paddingBottom: 2,
              }}
            />
            {inputError ? (
              <span className="text-[13px] font-mono" style={{ color: RH.red }}>{inputError}</span>
            ) : (
              <>
                <button
                  onClick={handleSubmit}
                  className="text-[13px] font-semibold cursor-pointer"
                  style={{ color: RH.neon }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setInputVal(''); }}
                  className="text-[13px] cursor-pointer"
                  style={{ color: RH.muted }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 cursor-pointer group"
            style={{ color: RH.muted }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] uppercase tracking-widest group-hover:text-white transition-colors">
              Add ticker
            </span>
          </button>
        )}
      </div>
      ) : null}
      </div>
    </div>
  );
}

// ── Metric display components ─────────────────────────────────────────────────

function MetricSm({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[12px] uppercase tracking-widest" style={{ color: RH.muted }}>{label}</span>
      <span className="text-[12px] font-semibold tabular-nums leading-none"
        style={{ color: color ?? RH.secondary }}>{value}</span>
    </div>
  );
}

function DeltaMetricSm({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[12px] uppercase tracking-widest" style={{ color: RH.muted }}>{label}</span>
      <span className="text-[12px] font-semibold tabular-nums leading-none"
        style={{ color: positive ? RH.green : RH.red }}>
        {positive ? '▲' : '▼'} {value}
      </span>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function fmtLiveCap(billions: number): string {
  if (billions >= 1000) return `$${(billions / 1000).toFixed(2)}T`;
  if (billions >= 100)  return `$${billions.toFixed(0)}B`;
  if (billions >= 1)    return `$${billions.toFixed(1)}B`;
  return `$${(billions * 1000).toFixed(0)}M`;
}

export default function SectorCard({ sector, health, accentColor, index, editAllowed }: SectorCardProps) {
  const [timeFrame, setTimeFrame]       = useState<TimeFrame>('3M');
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [peMode, setPeMode]             = useState<PeMode>('fwd');
  const [extraTickers, setExtraTickers]   = useState<TickerEntry[]>([]);
  const [removedTickers, setRemovedTickers] = useState<Set<string>>(new Set());
  const [indicators, setIndicators]       = useState<Set<Indicator>>(new Set());

  // ── Live data state ──────────────────────────────────────────────────────────
  const [liveQuotes, setLiveQuotes]     = useState<Record<string, TickerData>>({});
  const [quotesTs, setQuotesTs]         = useState<Date | null>(null);
  const [liveHistory, setLiveHistory]   = useState<{
    tf: TimeFrame;
    values: number[];
    labels: string[];
    dates: string[];
  } | null>(null);
  const [histLoading, setHistLoading]   = useState(false);
  const [sparklines, setSparklines]     = useState<Record<string, number[]>>({});

  const allTickers = [...sector.tickers, ...extraTickers].filter(t => !removedTickers.has(t.symbol));

  // ── Fetch live quotes for this sector's tickers (5-min polling) ──────────────
  const loadQuotes = useCallback(async () => {
    const syms = allTickers.map(t => t.symbol).join(',');
    try {
      const res  = await fetch(`/api/quotes?symbols=${syms}`);
      const data = await res.json() as TickerData[];
      setLiveQuotes(Object.fromEntries(data.map(d => [d.symbol, d])));
      setQuotesTs(new Date());
    } catch {
      // Silently fall back to mock data already in state
    }
  // Re-fetch when the ticker list changes (sector switch or manually added ticker)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.id, extraTickers.length]);

  useEffect(() => {
    loadQuotes();
    const iv = setInterval(loadQuotes, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [loadQuotes]);

  // ── Fetch 7-day EOD sparkline data (once per sector, refreshed every 15 min) ──
  const loadSparklines = useCallback(async () => {
    const syms = allTickers.map(t => t.symbol).join(',');
    try {
      const res  = await fetch(`/api/sparklines?symbols=${syms}`);
      if (res.ok) setSparklines(await res.json());
    } catch {
      // Keep existing (mock fallback in MiniSparkline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.id, extraTickers.length]);

  useEffect(() => {
    loadSparklines();
    const iv = setInterval(loadSparklines, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, [loadSparklines]);

  // ── Fetch real price history when a ticker is selected or timeframe changes ──
  useEffect(() => {
    if (!activeTicker) {
      setLiveHistory(null);
      setHistLoading(false);
      return;
    }
    const ac = new AbortController();
    const tf = timeFrame;
    setHistLoading(true);
    fetch(`/api/history/${activeTicker}?tf=${tf}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : Promise.resolve(null)))
      .then(data => {
        if (ac.signal.aborted) return;
        if (data?.values?.length) {
          setLiveHistory({
            tf,
            values: data.values,
            labels: data.labels,
            dates: data.dates ?? [],
          });
        } else {
          setLiveHistory(null);
        }
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return;
        setLiveHistory(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setHistLoading(false);
      });
    return () => ac.abort();
  }, [activeTicker, timeFrame]);

  const toggleIndicator = (ind: Indicator) =>
    setIndicators(prev => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });

  const handleAddTicker = useCallback(async (sym: string) => {
    // If the ticker was previously removed, just un-remove it
    setRemovedTickers(prev => {
      if (!prev.has(sym)) return prev;
      const next = new Set(prev); next.delete(sym); return next;
    });
    // Deduplicate: drop any existing entries for this sym, then append one clean entry
    setExtraTickers(prev => [...prev.filter(t => t.symbol !== sym), { symbol: sym, desc: '' }]);
    // Immediately fetch live data, sparkline, and company description in parallel
    try {
      const [qRes, sRes, pRes] = await Promise.all([
        fetch(`/api/quotes?symbols=${sym}`),
        fetch(`/api/sparklines?symbols=${sym}`),
        fetch(`/api/profile/${sym}`),
      ]);
      if (qRes.ok) {
        const data = (await qRes.json()) as TickerData[];
        if (data.length) setLiveQuotes(prev => ({ ...prev, [sym]: data[0] }));
      }
      if (sRes.ok) {
        const sparks = (await sRes.json()) as Record<string, number[]>;
        setSparklines(prev => ({ ...prev, ...sparks }));
      }
      if (pRes.ok) {
        const { description } = await pRes.json() as { description: string };
        if (description) {
          setExtraTickers(prev =>
            prev.map(t => t.symbol === sym ? { ...t, desc: description } : t),
          );
        }
      }
    } catch {
      // Silent — row shows "—" until next poll
    }
  }, []);

  const handleRemoveTicker = useCallback((sym: string) => {
    setRemovedTickers(prev => new Set([...prev, sym]));
    setActiveTicker(prev => prev === sym ? null : prev);
  }, []);

  // Live data for active ticker (falls back to static mock if live not yet loaded)
  const liveT  = activeTicker ? (liveQuotes[activeTicker] ?? tickerData[activeTicker]) : null;
  const ticker = liveT;

  // Sector aggregate: compute from live quotes when available
  const liveCapB = allTickers.reduce((s, t) => s + (liveQuotes[t.symbol]?.marketCapValue ?? 0), 0);
  const hasLive  = liveCapB > 0;

  // Weighted-average daily & YTD across sector tickers — single pass
  const sectorAvgs = useMemo(() => {
    let sumW = 0, sumDaily = 0, sumYtd = 0;
    for (const t of allTickers) {
      const q = liveQuotes[t.symbol];
      if (!q) continue;
      sumW      += q.marketCapValue;
      sumDaily  += q.dailyChangePercent * q.marketCapValue;
      sumYtd    += q.ytdChangePercent   * q.marketCapValue;
    }
    return sumW > 0
      ? { daily: sumDaily / sumW, ytd: sumYtd / sumW }
      : null;
  }, [liveQuotes, allTickers]);

  // Chart: only use fetched data when it matches the selected TF — avoids one frame (or more)
  // of stale prices after the user switches timeframes (effect runs after paint).
  const historyMatchesTf = Boolean(liveHistory && liveHistory.tf === timeFrame);
  const useLiveChart     = Boolean(activeTicker && historyMatchesTf && !histLoading);
  const chartId      = ticker ? `ticker-${ticker.symbol}` : sector.id;
  const chartValue   = ticker ? ticker.price : health.currentMarketCapValue;
  const chartVals  = useLiveChart && liveHistory
    ? liveHistory.values
    : generateChartData(chartId, chartValue, timeFrame);
  const chartLbls  = useLiveChart && liveHistory
    ? liveHistory.labels
    : getXAxisLabels(timeFrame, chartVals.length);
  const chartYFmt  = ticker ? fmtPrice : undefined; // ticker → share price; sector → $B market cap

  // Chart-implied change (first→last bar) — used when FMP has no field (1W, All)
  const chartPeriodReturn = useMemo(() => {
    if (!ticker || chartVals.length < 2) return null;
    const first = chartVals.find(v => isFinite(v) && v > 0);
    const last  = chartVals[chartVals.length - 1];
    if (!first || !isFinite(last)) return null;
    return ((last - first) / first) * 100;
  }, [ticker, chartVals]);

  const barPeriodPct = useMemo(() => {
    if (!ticker || !activeTicker) return null;
    const q = liveQuotes[activeTicker] ?? tickerData[activeTicker];
    return periodPercentForBar(q, timeFrame, chartPeriodReturn);
  }, [ticker, activeTicker, liveQuotes, timeFrame, chartPeriodReturn]);

  const cap     = ticker
    ? ticker.marketCap
    : hasLive
      ? fmtLiveCap(liveCapB)
      : health.currentMarketCap;
  const daily   = ticker ? ticker.dailyChangePercent : (sectorAvgs?.daily ?? health.dailyChangePercent);
  const ytd     = ticker ? ticker.ytdChangePercent   : (sectorAvgs?.ytd   ?? health.ytdChangePercent);
  const fpe     = ticker ? ticker.forwardPE   : health.forwardPE;
  const netDebt = ticker ? ticker.netDebt     : health.netDebt;
  const netDebtV = ticker ? ticker.netDebtValue : health.netDebtValue;
  const price   = ticker
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ticker.price)
    : null;

  // Last updated display
  const updatedStr = quotesTs
    ? quotesTs.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  const handleTicker = (sym: string) =>
    setActiveTicker(prev => (prev === sym ? null : sym));

  const Icon = SECTOR_ICONS[sector.id];

  return (
    <div
      className="flex flex-col min-w-0"
      style={{
        backgroundColor: RH.card,
        border: `1px solid ${ticker ? RH.borderActive : RH.border}`,
        borderRadius: 4,
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        {ticker ? (
          <>
            {/* Back breadcrumb */}
            <button
              onClick={() => setActiveTicker(null)}
              className="flex items-center gap-1.5 mb-3 cursor-pointer group"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M6.5 2L3 5L6.5 8" stroke={RH.muted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12px]" style={{ color: RH.muted }}>
                {sector.name}
              </span>
            </button>
            {/* Ticker identity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className="p-1.5" style={{ backgroundColor: `${accentColor}14`, borderRadius: 3 }}>
                    <Icon color={accentColor} size={16} />
                  </div>
                )}
                <div>
                  <span className="text-lg font-bold tracking-tight" style={{ color: RH.neon }}>
                    {ticker.symbol}
                  </span>
                  <span className="ml-2 text-xs" style={{ color: RH.secondary }}>
                    {ticker.name}
                  </span>
                </div>
              </div>
              <span className="text-[12px] font-mono" style={{ color: RH.muted }}>
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              {Icon && (
                <div className="shrink-0 p-1.5 mt-0.5" style={{ backgroundColor: `${accentColor}14`, borderRadius: 3 }}>
                  <Icon color={accentColor} size={16} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold leading-snug" style={{ color: RH.text }}>
                  {sector.name}
                </h3>
                <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-1" style={{ color: RH.muted }}>
                  {sector.description}
                </p>
              </div>
            </div>
            <span className="text-[12px] font-mono shrink-0 mt-0.5" style={{ color: RH.muted }}>
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* ── Metrics row ──────────────────────────────────── */}
      <div
        className="mx-5 mb-4 px-4 py-2 flex items-end gap-2"
        style={{
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {ticker ? (
          /* ── Ticker mode: all on one line ── */
          <>
            <div className="flex flex-col gap-0.5 shrink-0">
              <span className="text-[12px] uppercase tracking-widest" style={{ color: RH.muted }}>Price</span>
              <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: RH.text }}>
                {price}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 shrink-0">
              <span className="text-[12px] uppercase tracking-widest" style={{ color: RH.muted }}>Mkt Cap</span>
              <span className="text-[13px] font-semibold tabular-nums leading-none" style={{ color: RH.secondary }}>
                {cap}
              </span>
            </div>

            <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <DeltaMetricSm label="Daily" value={`${Math.abs(daily).toFixed(1)}%`} positive={daily >= 0} />
            <DeltaMetricSm
              label={timeFrame}
              value={barPeriodPct !== null ? `${Math.abs(barPeriodPct).toFixed(1)}%` : '—'}
              positive={barPeriodPct !== null ? barPeriodPct >= 0 : true}
            />

            <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <MetricSm label="Fwd P/E"  value={fpe !== null ? `${fpe.toFixed(1)}x` : 'NM'} />
            <MetricSm label="Net Debt" value={netDebt} color={netDebtV < 0 ? RH.green : RH.secondary} />
          </>
        ) : (
          /* ── Sector mode: Agg Cap left (large), rest inline ── */
          <>
            <div className="flex flex-col gap-0.5 shrink-0">
              <span className="text-[12px] uppercase tracking-widest" style={{ color: RH.muted }}>Agg Cap</span>
              <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: RH.text }}>
                {cap}
              </span>
            </div>

            <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <DeltaMetricSm label="Daily" value={`${Math.abs(daily).toFixed(1)}%`}  positive={daily >= 0} />
            <DeltaMetricSm label="YTD"   value={`${Math.abs(ytd).toFixed(1)}%`}    positive={ytd >= 0} />

            <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <MetricSm label="Fwd P/E"  value={fpe !== null ? `${fpe.toFixed(1)}x` : 'NM'} />
            <MetricSm label="Net Debt" value={netDebt} color={netDebtV < 0 ? RH.green : RH.secondary} />
          </>
        )}
      </div>

      {/* ── Chart ────────────────────────────────────────── */}
      <div className="mx-5 min-w-0 overflow-hidden relative" style={{ backgroundColor: RH.chartBg, borderRadius: 2 }}>
        {/* Loading shimmer overlay */}
        {histLoading && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: `${RH.chartBg}cc`, zIndex: 1 }}>
            <span className="text-[13px] font-mono" style={{ color: RH.muted }}>Loading…</span>
          </div>
        )}
        <LineChart
          values={chartVals} labels={chartLbls}
          dates={useLiveChart && liveHistory ? liveHistory.dates : undefined}
          color={accentColor} id={chartId}
          indicators={indicators}
          yFmt={chartYFmt}
          timeFrame={timeFrame}
        />
      </div>

      {/* ── Time frame + indicator controls ──────────────── */}
      <div className="px-5 pt-2 pb-1.5 flex items-center justify-between gap-2">
        {/* Time frames */}
        <div className="flex gap-0.5">
          {TIME_FRAMES.map(tf => {
            const on = tf === timeFrame;
            return (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className="text-[13px] font-semibold px-2 py-1 transition-all duration-100 cursor-pointer"
                style={{
                  borderRadius: 2,
                  backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: on ? RH.text : RH.muted,
                }}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Right side: indicator toggles + live timestamp */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['bb', 'vol', 'rsi'] as Indicator[]).map(ind => {
              const on     = indicators.has(ind);
              const labels = { bb: 'BB', vol: 'Vol', rsi: 'RSI' };
              return (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className="text-[10.5px] font-semibold px-2 py-0.5 cursor-pointer transition-all duration-100"
                  style={{
                    borderRadius:    2,
                    backgroundColor: on ? `${accentColor}18` : 'transparent',
                    color:           on ? accentColor : RH.muted,
                    border:          `1px solid ${on ? `${accentColor}60` : 'rgba(255,255,255,0.08)'}`,
                    letterSpacing:   '0.04em',
                  }}
                >
                  {labels[ind]}
                </button>
              );
            })}
          </div>

          {/* Live data timestamp */}
          {updatedStr && (
            <span className="flex items-center gap-1" style={{ color: RH.muted }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColor, opacity: 0.8 }} />
              <span className="text-[12px] font-mono">{updatedStr}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Ticker table ─────────────────────────────────── */}
      <TickerTable
        tickers={allTickers}
        activeTicker={activeTicker}
        peMode={peMode}
        liveQuotes={liveQuotes}
        sparklines={sparklines}
        onSelect={handleTicker}
        onTogglePE={() => setPeMode(m => m === 'fwd' ? 'ttm' : 'fwd')}
        onAdd={handleAddTicker}
        onRemove={handleRemoveTicker}
        editAllowed={editAllowed}
      />
    </div>
  );
}
