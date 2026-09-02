import { useEffect, useState } from "react";
import { getKoreaMarketSnapshot } from "../utils/koreaMarketClock";

function currentRegularDay() {
  const market = getKoreaMarketSnapshot();
  return market.isOpen ? market.tradingDate : null;
}

export function useRegularMarketDay() {
  const [day, setDay] = useState(currentRegularDay);
  useEffect(() => {
    const refresh = () => setDay(currentRegularDay());
    const timer = window.setInterval(refresh, 1_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
