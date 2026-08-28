import type { ApiError } from "../api";

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
  if (!hasMore) return null;
  return (
    <div className="view-more-wrap">
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={loading}
      >
        {loading
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
