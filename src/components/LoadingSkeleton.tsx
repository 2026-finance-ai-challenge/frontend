export function LoadingSkeleton({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return <span className={`loading-skeleton ${className}`.trim()} role="status" aria-label="Loading">
    {Array.from({ length: lines }, (_, index) => <i key={index} />)}
  </span>;
}
