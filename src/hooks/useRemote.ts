import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
  const retry = useCallback(() => setNonce((value) => value + 1), []);
  const acceptData = useCallback((value: T) => {
    setData(value);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setData(null);
    // 요청 식별자가 바뀌면 이전 엔터티의 응답을 화면에 남기지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

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
  // 호출부가 전달한 원시 요청 식별자가 바뀔 때만 다시 조회한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, nonce]);

  return {
    data,
    error,
    loading,
    retry,
    setData: acceptData,
  };
}
