'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { hardcodedFavoriteTickerSet } from '@/src/data/hardcodedFavoriteTickers';
import {
  TICKER_FAVORITES_STORAGE_KEY,
  isHardcodedFavorite,
  loadFavoriteTickers,
  saveFavoriteTickers,
} from '@/src/lib/tickerFavorites';

type TickerFavoritesContextValue = {
  favorites: Set<string>;
  toggleFavorite: (sym: string) => void;
};

const TickerFavoritesContext = createContext<TickerFavoritesContextValue | null>(null);

export function TickerFavoritesProvider({ children }: { children: React.ReactNode }) {
  /** Same on server and first client paint — avoids hydration mismatch vs localStorage. */
  const [favorites, setFavorites] = useState<Set<string>>(() => hardcodedFavoriteTickerSet());

  /** After hydration, merge localStorage before paint so UI (and toggles) see full set. */
  useLayoutEffect(() => {
    setFavorites(loadFavoriteTickers());
  }, []);

  const toggleFavorite = useCallback((sym: string) => {
    const u = sym.trim().toUpperCase();
    if (!u) return;
    setFavorites(() => {
      /** Never branch from `prev`: before LS merge it is only hardcoded and would wipe extras on save. */
      const next = new Set(loadFavoriteTickers());
      if (next.has(u)) {
        if (isHardcodedFavorite(u)) return next;
        next.delete(u);
      } else {
        next.add(u);
      }
      saveFavoriteTickers(next);
      return loadFavoriteTickers();
    });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TICKER_FAVORITES_STORAGE_KEY || e.key === null)
        setFavorites(loadFavoriteTickers());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({ favorites, toggleFavorite }),
    [favorites, toggleFavorite],
  );

  return (
    <TickerFavoritesContext.Provider value={value}>
      {children}
    </TickerFavoritesContext.Provider>
  );
}

export function useTickerFavorites(): TickerFavoritesContextValue {
  const ctx = useContext(TickerFavoritesContext);
  if (!ctx) {
    throw new Error('useTickerFavorites must be used within TickerFavoritesProvider');
  }
  return ctx;
}
