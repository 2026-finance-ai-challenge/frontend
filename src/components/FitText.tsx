import { useLayoutEffect, useRef } from "react";

export function FitText({ value, className, minSize = 9.5, maxSize = 22 }: {
  value: string;
  className: string;
  minSize?: number;
  maxSize?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const container = element?.parentElement;
    if (!element || !container) return;
    let frame = 0;
    const fit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        element.style.fontSize = `${maxSize}px`;
        if (element.scrollWidth <= element.clientWidth) return;
        let low = minSize;
        let high = maxSize;
        for (let index = 0; index < 8; index += 1) {
          const middle = (low + high) / 2;
          element.style.fontSize = `${middle}px`;
          if (element.scrollWidth <= element.clientWidth) low = middle;
          else high = middle;
        }
        element.style.fontSize = `${Math.floor(low * 10) / 10}px`;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [maxSize, minSize, value]);

  return <b className={className} ref={ref}>{value}</b>;
}
