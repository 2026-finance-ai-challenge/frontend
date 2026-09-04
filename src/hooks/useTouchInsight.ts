import { useEffect, useRef, useState } from "react";

export function useTouchInsight() {
  const anchor = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setTouch(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = anchor.current;
    if (!touch || !element) { setActive(false); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 읽는 도중 카드가 접혀 스크롤이 튀지 않도록 한번 노출한 요약은 유지한다.
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) timer = setTimeout(() => {
        setActive(true);
        observer.disconnect();
      }, 400);
    }, { rootMargin: "-20% 0px -30% 0px", threshold: 0 });
    observer.observe(element);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [touch]);
  return { anchor, touch, active };
}
