import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "kart-watchlist";
const initialWatchlist = ["samsung-electronics", "samsung-sdi"];

type WatchlistContextValue = {
  isSaved: (itemId: string) => boolean;
  toggle: (itemId: string) => void;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function loadWatchlist() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return new Set<string>(saved ? JSON.parse(saved) : initialWatchlist);
  } catch {
    return new Set(initialWatchlist);
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [savedItems, setSavedItems] = useState(loadWatchlist);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...savedItems]));
  }, [savedItems]);

  const value = useMemo<WatchlistContextValue>(
    () => ({
      isSaved: (itemId) => savedItems.has(itemId),
      toggle: (itemId) =>
        setSavedItems((current) => {
          const next = new Set(current);
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
          return next;
        }),
    }),
    [savedItems],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return context;
}
