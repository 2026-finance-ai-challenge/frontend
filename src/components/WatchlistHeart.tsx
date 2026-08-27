import type { MouseEvent } from "react";
import { useWatchlist } from "../state/WatchlistContext";

type WatchlistHeartProps = {
  itemId: string;
  itemName: string;
  className?: string;
  iconClassName?: string;
  keepFocus?: boolean;
};

export function WatchlistHeart({
  itemId,
  itemName,
  className = "heart-button",
  iconClassName,
  keepFocus = false,
}: WatchlistHeartProps) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(itemId);

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (keepFocus) event.preventDefault();
  };

  return (
    <button
      className={className}
      type="button"
      aria-label={`${saved ? "Remove" : "Add"} ${itemName} ${saved ? "from" : "to"} watchlist`}
      aria-pressed={saved}
      onMouseDown={handleMouseDown}
      onClick={() => void toggle(itemId)}
    >
      <img
        className={iconClassName}
        src={
          saved ? "/assets/heart-filled.svg" : "/assets/heart-outline.svg"
        }
        alt=""
      />
    </button>
  );
}
