import type { ReactNode } from "react";
import { ApiError } from "../api";
import { useLocale } from "../state/LocaleContext";
import { formatContentDate } from "../utils/contentDate";

export function RemoteState<T>({
  data,
  error,
  loading,
  retry,
  children,
  empty,
  emptyMessage,
}: {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  retry: () => void;
  children: (data: T) => ReactNode;
  empty?: (data: T) => boolean;
  emptyMessage?: string;
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
    return <div className="api-state">{emptyMessage || t("noData")}</div>;
  }
  return <>{children(data)}</>;
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
) {
  return value === null || value === undefined
    ? activeLocale() === "ko-KR" ? "정보 없음" : "Unavailable"
    : new Intl.NumberFormat(activeLocale(), options).format(value);
}

export function formatDate(value: string | null | undefined, time = true) {
  return formatContentDate(value, activeLocale(), time);
}

function activeLocale() {
  return localStorage.getItem("kart-locale") === "ko" ? "ko-KR" : "en-US";
}
