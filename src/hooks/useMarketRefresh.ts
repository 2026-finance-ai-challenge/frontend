import { useEffect } from "react";

export function useMarketRefresh(windowKey: string | null, loading: boolean, refresh: () => void, interval = 60_000) {
  useEffect(() => {
    if (!windowKey || loading) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // 장외에 준비된 다음 거래일 예측도 갱신하며 숨겨진 탭에서는 조회하지 않는다.
    const timer = window.setInterval(refreshVisible, interval);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [windowKey, loading, refresh, interval]);
}
