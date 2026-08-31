import type { ReactNode } from "react";
import { ApiError } from "../api";
import { useLocale } from "../state/LocaleContext";

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
  const { t } = useLocale();
  if (loading && data === null) {
    return <div className="api-state api-loading" role="status">{t("loading")}</div>;
  }
  if (error) {
    return (
      <div className="api-state api-error" role="alert">
        <b>{error.status === 401 ? t("signInRequired") : t("dataUnavailable")}</b>
        <span>{error.message}</span>
        {error.status !== 401 ? <button onClick={retry}>{t("retry")}</button> : null}
      </div>
    );
  }
  if (data === null) return null;
  if (empty?.(data)) {
    return <div className="api-state">{t("noData")}</div>;
  }
  return <>{children(data)}</>;
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
) {
  return value === null || value === undefined
    ? document.documentElement.lang === "ko" ? "정보 없음" : "Unavailable"
    : new Intl.NumberFormat(document.documentElement.lang === "ko" ? "ko-KR" : "en-US", options).format(value);
}

export function formatDate(value: string | null | undefined, time = true) {
  if (!value) return document.documentElement.lang === "ko" ? "정보 없음" : "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(document.documentElement.lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" } : {}),
  }).format(parsed);
}
