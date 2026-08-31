import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { TranslationResult } from "../types";
import { useRemote } from "./useRemote";

export function useAutomaticTranslation(path: string, enabled = true) {
  const state = useRemote(
    (signal) => enabled
      ? api<TranslationResult>(path, { signal })
      : Promise.resolve<TranslationResult | null>(null),
    [path, enabled],
  );
  const requestedPath = useRef<string | null>(null);
  const [requestError, setRequestError] = useState<ApiError | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    requestedPath.current = null;
    setRequestError(null);
    setRequesting(false);
  }, [path]);

  useEffect(() => {
    if (!enabled || !state.data || (state.data.status !== "NOT_REQUESTED" && state.data.status !== "FAILED")) return;
    if (requestedPath.current === path) return;
    requestedPath.current = path;
    setRequestError(null);
    setRequesting(true);
    void api<TranslationResult>(path, { method: "POST" })
      .then(state.setData)
      .catch((reason: unknown) => {
        setRequestError(
          reason instanceof ApiError
            ? reason
            : new ApiError({ message: String(reason) }),
        );
      })
      .finally(() => {
        if (requestedPath.current === path) setRequesting(false);
      });
  }, [enabled, path, state.data, state.setData]);

  useEffect(() => {
    if (!enabled || (state.data?.status !== "PENDING" && state.data?.status !== "PROCESSING")) return;
    const timer = window.setTimeout(state.retry, 2_500);
    return () => window.clearTimeout(timer);
  }, [enabled, state.data?.status, state.retry]);

  return { ...state, requestError, requesting };
}
