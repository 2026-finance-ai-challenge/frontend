import type { ApiError } from "../api";
import { useLocale } from "../state/LocaleContext";

export function ViewMoreButton({
  resource,
  hasMore,
  loading,
  error,
  className = "more-filings",
  onClick,
}: {
  resource: "news" | "filings";
  hasMore: boolean;
  loading: boolean;
  error: ApiError | null;
  className?: string;
  onClick: () => void;
}) {
  const { locale } = useLocale();
  if (!hasMore) return null;
  const resourceLabel = resource === "news" ? "뉴스" : "공시";
  return (
    <div className="view-more-wrap">
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={loading}
      >
        {locale === "ko"
          ? loading
            ? `${resourceLabel} 불러오는 중…`
            : error
              ? `${resourceLabel} 다시 불러오기`
              : `${resourceLabel} 더 보기`
          : loading
            ? `Loading ${resource}…`
            : error
              ? `Retry loading ${resource}`
              : `View more ${resource}`}
        <img src="/assets/chevron-down-gold.svg" alt="" />
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  );
}
