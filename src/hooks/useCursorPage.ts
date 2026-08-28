import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api";

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export function useCursorPage<T>(
  loader: (cursor: string | null, signal: AbortSignal) => Promise<CursorPage<T>>,
  dependencies: readonly unknown[],
  itemKey: (item: T) => string,
) {
  const [data, setData] = useState<CursorPage<T> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);
  const loadMoreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadMoreController.current?.abort();
    setData(null);
    setError(null);
    setLoadMoreError(null);
    setLoading(true);
    setLoadingMore(false);
    loader(null, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof ApiError
            ? reason
            : new ApiError({ message: String(reason) }),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      loadMoreController.current?.abort();
    };
  // Callers pass primitive request dependencies; loader intentionally follows them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, nonce]);

  const loadMore = async () => {
    const cursor = data?.nextCursor;
    if (!cursor || loadingMore) return;
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = await loader(cursor, controller.signal);
      setData((current) => {
        if (!current) return nextPage;
        const keys = new Set(current.items.map(itemKey));
        return {
          items: [
            ...current.items,
            ...nextPage.items.filter((item) => !keys.has(itemKey(item))),
          ],
          nextCursor: nextPage.nextCursor,
        };
      });
    } catch (reason) {
      if (controller.signal.aborted) return;
      setLoadMoreError(
        reason instanceof ApiError
          ? reason
          : new ApiError({ message: String(reason) }),
      );
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  return {
    data,
    error,
    loadMoreError,
    loading,
    loadingMore,
    loadMore,
    retry: () => setNonce((value) => value + 1),
  };
}
