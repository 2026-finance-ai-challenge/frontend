import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api";
import { useProfile } from "../hooks/useRemote";
import type { Stock } from "../types";

type WatchlistContextValue = {
  isSaved: (stockCode: string) => boolean;
  toggle: (stockCode: string) => Promise<void>;
  remove: (stockCode: string) => Promise<void>;
  loading: boolean;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const [savedItems, setSavedItems] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      setSavedItems(new Set());
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api<{ items: Stock[] }>("/api/v1/me/watchlist", { signal: controller.signal })
      .then(({ items }) => setSavedItems(new Set(items.map((item) => item.stockCode))))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [profile]);

  const toggle = useCallback(async (stockCode: string) => {
    if (!profile) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    const wasSaved = savedItems.has(stockCode);
    setSavedItems((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(stockCode);
      else next.add(stockCode);
      return next;
    });
    try {
      await api(`/api/v1/me/watchlist/${stockCode}`, {
        method: wasSaved ? "DELETE" : "PUT",
      });
    } catch (error) {
      setSavedItems((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(stockCode);
        else next.delete(stockCode);
        return next;
      });
      throw error;
    }
  }, [profile, savedItems]);

  const remove = useCallback(async (stockCode: string) => {
    await api(`/api/v1/me/watchlist/${stockCode}`, { method: "DELETE" });
    setSavedItems((current) => { const next = new Set(current); next.delete(stockCode); return next; });
  }, []);
  const value = useMemo<WatchlistContextValue>(() => ({
    isSaved: (stockCode) => savedItems.has(stockCode),
    toggle,
    remove,
    loading,
  }), [loading, savedItems, toggle, remove]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used within WatchlistProvider");
  return context;
}
