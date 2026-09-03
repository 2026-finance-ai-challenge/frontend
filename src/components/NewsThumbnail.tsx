import { useState } from "react";

const NO_IMAGE_ASSET = "/assets/no-image-available.svg";

export function NewsThumbnail({
  src,
  className = "",
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (src && failedSource !== src) {
    return <img className={className} src={src} alt="" loading="lazy" onError={() => setFailedSource(src)} />;
  }

  return (
    <span className={`news-thumbnail-empty ${className}`.trim()} aria-label="No source thumbnail">
      <img src={NO_IMAGE_ASSET} alt="" />
    </span>
  );
}
