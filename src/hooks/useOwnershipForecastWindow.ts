import { useEffect, useState } from "react";
import { getOwnershipForecastWindow } from "../utils/koreaMarketClock";

export function useOwnershipForecastWindow() {
  const [window, setWindow] = useState(getOwnershipForecastWindow);
  useEffect(() => {
    const refresh = () => {
      const next = getOwnershipForecastWindow();
      setWindow(current => current.targetDate === next.targetDate && current.session === next.session ? current : next);
    };
    const timer = globalThis.setInterval(refresh, 1_000);
    globalThis.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      globalThis.clearInterval(timer);
      globalThis.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return window;
}
