import { useEffect } from "react";

export function useMarketRefresh(regularDay: string | null, loading: boolean, refresh: () => void) {
  useEffect(() => {
    if (!regularDay || loading) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // 장중 늦게 준비된 예측도 갱신하며 숨겨진 탭에서는 조회하지 않는다.
    const timer = window.setInterval(refreshVisible, 60_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [regularDay, loading, refresh]);
}
