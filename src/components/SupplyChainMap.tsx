'use client';

import { useState, useEffect } from 'react';
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

const LS_KEY = 'dc-intelligence-layout';

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

// ── Seed ──────────────────────────────────────────────────────────────────

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

// ── localStorage helpers ──────────────────────────────────────────────────

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LayoutState;
  } catch { /* ignore */ }
  return buildSeed();
}

function saveLayout(state: LayoutState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ── Utilities ─────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function accentFor(sectorId: string, index: number): string {
  return FIXED_ACCENT[sectorId] ?? ACCENT_PALETTE[index % ACCENT_PALETTE.length];
}

function defaultHealth(id: string): SectorHealth {
  return { id, currentMarketCap: '—', currentMarketCapValue: 0, previousMarketCap: '—', qoqChangePercent: 0, dailyChangePercent: 0, ytdChangePercent: 0, forwardPE: 0, netDebt: '—', netDebtValue: 0 };
}

function gridCols(count: number) {
  // Single sector: ~half of page shell (max-w-[1400px]) so it matches scale of other sections, not full-bleed.
  if (count === 1)
    return 'grid-cols-1 w-full min-w-0 justify-items-center [&>*]:w-full [&>*]:max-w-[700px] [&>*]:min-w-0 [&>*]:mx-auto';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2';
}

// ── Colours ───────────────────────────────────────────────────────────────

const C = {
  muted:  '#555',
  dim:    '#333',
  text:   '#e8e8e8',
  sub:    '#888',
  neon:   '#b1ff56',
  border: 'rgba(255,255,255,0.08)',
  borderDash: 'rgba(255,255,255,0.06)',
};

// ── Small shared input ─────────────────────────────────────────────────────

function InlineInput({ placeholder, value, onChange, onKeyDown, autoFocus, dim }: {
  placeholder: string; value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean; dim?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className="bg-transparent outline-none border-b pb-0.5 w-full"
      style={{ color: dim ? C.sub : C.text, borderColor: dim ? C.borderDash : C.border, fontSize: dim ? 10 : 11 }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function SupplyChainMap({ editAllowed }: { editAllowed: boolean }) {
  // Initialise from seed; hydrate from localStorage after mount
  const [layout, setLayout]     = useState<LayoutState>(buildSeed);
  const [hydrated, setHydrated] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Drag state — sectors
  const [dragSrc, setDragSrc]   = useState<{ layerId: string; sectorId: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // sectorId

  // Drag state — layers
  const [dragLayerSrc,  setDragLayerSrc]  = useState<string | null>(null); // layerId
  const [dragLayerOver, setDragLayerOver] = useState<string | null>(null); // layerId

  // Add-sector form
  const [addingTo, setAddingTo]   = useState<string | null>(null); // layerId
  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');

  // Add-layer form
  const [addingLayer, setAddingLayer]       = useState(false);
  const [newLayerLabel, setNewLayerLabel]   = useState('');
  const [newLayerSub, setNewLayerSub]       = useState('');

  // If server revokes edit access, exit layout-edit UI
  useEffect(() => {
    if (!editAllowed) {
      setEditMode(false);
      setAddingTo(null);
      setNewName('');
      setNewDesc('');
      setAddingLayer(false);
      setNewLayerLabel('');
      setNewLayerSub('');
    }
  }, [editAllowed]);

  // ── Hydrate from localStorage once ─────────────────────────────────────
  useEffect(() => {
    setLayout(loadLayout());
    setHydrated(true);
  }, []);

  // ── Persist on every change (after hydration) ───────────────────────────
  useEffect(() => {
    if (hydrated) saveLayout(layout);
  }, [layout, hydrated]);

  // ── Static sector data (from sectors.json) ──────────────────────────────
  const jsonSectorMap = Object.fromEntries(sectorsData.sectors.map(s => [s.id, s]));

  function sectorForCard(id: string) {
    const stored  = layout.sectors[id];
    const fromJson = jsonSectorMap[id];
    return {
      id,
      name:        stored?.name        ?? fromJson?.name        ?? id,
      description: stored?.description ?? fromJson?.description ?? '',
      tickers:     fromJson?.tickers   ?? [],
    };
  }

  // All sector IDs in order (for accent colour assignment)
  const allSectorIds = layout.layers.flatMap(l => l.sectorIds);

  // ── Mutations ───────────────────────────────────────────────────────────

  function update(fn: (prev: LayoutState) => LayoutState) { setLayout(fn); }

  function reorderSectors(layerId: string, fromId: string, toId: string) {
    if (fromId === toId) return;
    update(prev => ({
      ...prev,
      layers: prev.layers.map(l => {
        if (l.id !== layerId) return l;
        const ids = [...l.sectorIds];
        const fi = ids.indexOf(fromId), ti = ids.indexOf(toId);
        if (fi === -1 || ti === -1) return l;
        ids.splice(fi, 1);
        ids.splice(ti, 0, fromId);
        return { ...l, sectorIds: ids };
      }),
    }));
  }

  function reorderLayers(fromId: string, toId: string) {
    if (fromId === toId) return;
    update(prev => {
      const ls = [...prev.layers];
      const fi = ls.findIndex(l => l.id === fromId);
      const ti = ls.findIndex(l => l.id === toId);
      if (fi === -1 || ti === -1) return prev;
      const [item] = ls.splice(fi, 1);
      ls.splice(ti, 0, item);
      return { ...prev, layers: ls };
    });
  }

  function removeSector(layerId: string, sectorId: string) {
    update(prev => ({
      ...prev,
      layers: prev.layers.map(l =>
        l.id === layerId ? { ...l, sectorIds: l.sectorIds.filter(id => id !== sectorId) } : l,
      ),
    }));
  }

  function removeLayer(layerId: string) {
    update(prev => ({ ...prev, layers: prev.layers.filter(l => l.id !== layerId) }));
  }

  function addSector(layerId: string) {
    const name = newName.trim();
    if (!name) return;
    const id: string = `custom_${uid()}`;
    update(prev => ({
      layers:  prev.layers.map(l => l.id === layerId ? { ...l, sectorIds: [...l.sectorIds, id] } : l),
      sectors: { ...prev.sectors, [id]: { id, name, description: newDesc.trim() } },
    }));
    setNewName(''); setNewDesc(''); setAddingTo(null);
  }

  function addLayer() {
    const label = newLayerLabel.trim();
    if (!label) return;
    const id = `layer-${uid()}`;
    update(prev => ({ ...prev, layers: [...prev.layers, { id, label, sublabel: newLayerSub.trim(), sectorIds: [] }] }));
    setNewLayerLabel(''); setNewLayerSub(''); setAddingLayer(false);
  }

  function cancelAddSector() { setAddingTo(null); setNewName(''); setNewDesc(''); }
  function cancelAddLayer()  { setAddingLayer(false); setNewLayerLabel(''); setNewLayerSub(''); }

  const canEditLayout = editAllowed && editMode;

  // ── Render ──────────────────────────────────────────────────────────────

  let globalIndex = 0;

  return (
    <div className="w-full space-y-1">

      {/* Edit toggle — only when server allows (see EDIT_ACCESS_SECRET + /unlock) */}
      {editAllowed ? (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => { setEditMode(m => !m); cancelAddSector(); cancelAddLayer(); }}
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              color:           editMode ? C.neon : C.muted,
              border:          `1px solid ${editMode ? '#b1ff5640' : C.border}`,
              backgroundColor: editMode ? '#b1ff5608' : 'transparent',
            }}
          >
            {editMode ? 'Done' : 'Edit layout'}
          </button>
        </div>
      ) : null}

      {layout.layers.map((layer, layerIdx) => {
        const layerStart       = globalIndex;
        globalIndex           += layer.sectorIds.length;
        const isLayerDragging  = dragLayerSrc === layer.id;
        const isLayerDragOver  = dragLayerOver === layer.id && dragLayerSrc !== layer.id;

        return (
          <div
            key={layer.id}
            draggable={canEditLayout}
            onDragStart={canEditLayout ? e => { e.stopPropagation(); setDragLayerSrc(layer.id); } : undefined}
            onDragOver={canEditLayout && dragLayerSrc && dragLayerSrc !== layer.id
              ? e => { e.preventDefault(); setDragLayerOver(layer.id); }
              : undefined}
            onDrop={canEditLayout && dragLayerSrc
              ? e => { e.preventDefault(); reorderLayers(dragLayerSrc, layer.id); setDragLayerSrc(null); setDragLayerOver(null); }
              : undefined}
            onDragEnd={() => { setDragLayerSrc(null); setDragLayerOver(null); }}
            style={{
              opacity:    isLayerDragging ? 0.35 : 1,
              outline:    isLayerDragOver ? '1px solid rgba(177,255,86,0.25)' : 'none',
              borderRadius: 6,
              transition: 'opacity 100ms',
            }}
          >
            {/* Layer header */}
            <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
              {canEditLayout && (
                <span
                  className="cursor-grab select-none shrink-0"
                  style={{ color: '#666', fontSize: 14, lineHeight: 1 }}
                  title="Drag to reorder layer"
                >⠿</span>
              )}
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] shrink-0" style={{ color: '#444' }}>
                {layer.label}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
              {canEditLayout && (
                <button
                  onClick={() => removeLayer(layer.id)}
                  className="shrink-0 text-[11px] px-1.5 py-0.5 rounded leading-none"
                  style={{ color: C.muted, border: `1px solid ${C.border}` }}
                  title="Remove layer"
                >✕</button>
              )}
            </div>

            {/* Sector cards */}
            <div className={`grid gap-4 w-full ${gridCols(layer.sectorIds.length)}`}>
              {layer.sectorIds.map((sectorId, cardIdx) => {
                const sector       = sectorForCard(sectorId);
                const health       = sectorHealthData[sectorId] ?? defaultHealth(sectorId);
                const color        = accentFor(sectorId, allSectorIds.indexOf(sectorId));
                const isDragging   = dragSrc?.sectorId === sectorId;
                const isDragTarget = dragOver === sectorId && !isDragging;

                return (
                  <div
                    key={sectorId}
                    className="min-w-0"
                    draggable={canEditLayout}
                    onDragStart={canEditLayout ? e => { e.stopPropagation(); setDragSrc({ layerId: layer.id, sectorId }); } : undefined}
                    onDragOver={canEditLayout && dragSrc?.layerId === layer.id && dragSrc.sectorId !== sectorId
                      ? e => { e.preventDefault(); setDragOver(sectorId); }
                      : undefined}
                    onDrop={canEditLayout && dragSrc?.layerId === layer.id
                      ? e => { e.preventDefault(); reorderSectors(layer.id, dragSrc.sectorId, sectorId); setDragSrc(null); setDragOver(null); }
                      : undefined}
                    onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                    style={{
                      opacity:      isDragging ? 0.25 : 1,
                      outline:      isDragTarget ? '1px solid rgba(177,255,86,0.35)' : 'none',
                      borderRadius: 4,
                      transition:   'opacity 100ms',
                      position:     'relative',
                    }}
                  >
                    {/* Edit-mode card overlay controls */}
                    {canEditLayout && (
                      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          className="cursor-grab select-none"
                          style={{ color: '#666', fontSize: 13, lineHeight: 1 }}
                          title="Drag to reorder"
                        >⠿</span>
                        <button
                          onClick={() => removeSector(layer.id, sectorId)}
                          className="text-[11px] px-1 py-0.5 rounded leading-none"
                          style={{ color: C.muted, border: `1px solid ${C.border}`, backgroundColor: '#0e0e0e' }}
                          title={`Remove ${sector.name}`}
                        >✕</button>
                      </div>
                    )}

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

            {/* Add sector — below the grid */}
            {canEditLayout && (
              <div className="mt-3">
                {addingTo === layer.id ? (
                  <div
                    className="flex flex-col gap-2 p-3 rounded"
                    style={{ border: `1px solid ${C.border}`, backgroundColor: '#111' }}
                  >
                    <InlineInput
                      autoFocus
                      placeholder="Sector name"
                      value={newName}
                      onChange={setNewName}
                      onKeyDown={e => { if (e.key === 'Enter') addSector(layer.id); if (e.key === 'Escape') cancelAddSector(); }}
                    />
                    <InlineInput
                      dim
                      placeholder="Description (optional)"
                      value={newDesc}
                      onChange={setNewDesc}
                      onKeyDown={e => { if (e.key === 'Enter') addSector(layer.id); if (e.key === 'Escape') cancelAddSector(); }}
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => addSector(layer.id)} className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: C.neon, border: '1px solid #b1ff5640' }}>Add</button>
                      <button onClick={cancelAddSector} className="text-[11px] uppercase tracking-wider px-2 py-0.5" style={{ color: C.muted }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingTo(layer.id); cancelAddLayer(); }}
                    className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ color: C.dim, border: `1px dashed ${C.borderDash}` }}
                  >+ Add sector</button>
                )}
              </div>
            )}

            {/* Flow connector */}
            {layerIdx < layout.layers.length - 1 && (
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

      {/* Add layer */}
      {canEditLayout && (
        <div className="mt-6">
          {addingLayer ? (
            <div
              className="flex flex-col gap-2 p-3 rounded"
              style={{ border: `1px solid ${C.border}`, backgroundColor: '#111', maxWidth: 360 }}
            >
              <InlineInput
                autoFocus
                placeholder="Layer label (e.g. Layer 6 — Security)"
                value={newLayerLabel}
                onChange={setNewLayerLabel}
                onKeyDown={e => { if (e.key === 'Enter') addLayer(); if (e.key === 'Escape') cancelAddLayer(); }}
              />
              <InlineInput
                dim
                placeholder="Sublabel (optional)"
                value={newLayerSub}
                onChange={setNewLayerSub}
                onKeyDown={e => { if (e.key === 'Enter') addLayer(); if (e.key === 'Escape') cancelAddLayer(); }}
              />
              <div className="flex gap-2 mt-1">
                <button onClick={addLayer} className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: C.neon, border: '1px solid #b1ff5640' }}>Add layer</button>
                <button onClick={cancelAddLayer} className="text-[11px] uppercase tracking-wider px-2 py-0.5" style={{ color: C.muted }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingLayer(true); cancelAddSector(); }}
              className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ color: C.dim, border: `1px dashed ${C.borderDash}` }}
            >+ Add layer</button>
          )}
        </div>
      )}
    </div>
  );
}
