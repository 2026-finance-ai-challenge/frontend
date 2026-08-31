import { useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, session } from "../api";
import type { Profile } from "../types";

export function useProfile(): Profile | null {
  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.user,
    () => null,
  );
}

export function useRemote<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: readonly unknown[],
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loader(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
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
    return () => controller.abort();
  // Callers pass primitive request dependencies; loader intentionally follows them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, nonce]);

  return {
    data,
    error,
    loading,
    retry: () => setNonce((value) => value + 1),
    setData,
  };
}
