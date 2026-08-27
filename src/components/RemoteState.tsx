import type { ReactNode } from "react";
import { ApiError } from "../api";

export function RemoteState<T>({
  data,
  error,
  loading,
  retry,
  children,
  empty,
}: {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  retry: () => void;
  children: (data: T) => ReactNode;
  empty?: (data: T) => boolean;
}) {
  if (loading && data === null) {
    return <div className="api-state api-loading" role="status">Loading current data…</div>;
  }
  if (error) {
    return (
      <div className="api-state api-error" role="alert">
        <b>{error.status === 401 ? "Sign in required" : "Data unavailable"}</b>
        <span>{error.message}</span>
        {error.status !== 401 ? <button onClick={retry}>Retry</button> : null}
      </div>
    );
  }
  if (data === null) return null;
  if (empty?.(data)) {
    return <div className="api-state">No matching data is available.</div>;
  }
  return <>{children(data)}</>;
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
) {
  return value === null || value === undefined
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", options).format(value);
}

export function formatDate(value: string | null | undefined, time = true) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" } : {}),
  }).format(parsed);
}
