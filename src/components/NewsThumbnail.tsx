export function NewsThumbnail({
  src,
  className = "",
}: {
  src: string | null | undefined;
  className?: string;
}) {
  if (src) {
    return <img className={className} src={src} alt="" loading="lazy" />;
  }

  return (
    <span className={`news-thumbnail-empty ${className}`.trim()} aria-label="No source thumbnail">
      <img src="/assets/news.svg" alt="" />
    </span>
  );
}
