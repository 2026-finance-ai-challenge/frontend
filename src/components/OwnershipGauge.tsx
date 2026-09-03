import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OwnershipPredictionOverlay } from "./OwnershipPrediction";
import type { OwnershipPrediction } from "./ownershipPredictionModel";

export function OwnershipGauge({ className, tone, value, prediction }: {
  className: string;
  tone: string;
  value: number | null | undefined;
  prediction: OwnershipPrediction | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const valid = value != null && Number.isFinite(value);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`${className} ownership-gauge${revealed ? " is-revealed" : ""}`}
    style={{ "--ownership-fill": `${valid ? Math.max(0, Math.min(value, 100)) : 0}%` } as CSSProperties} aria-hidden="true">
    <span className={`ownership-gauge-fill ${tone}`} />
    {valid ? <i className="ownership-gauge-marker" /> : null}
    {prediction ? <OwnershipPredictionOverlay prediction={prediction} /> : null}
  </div>;
}
