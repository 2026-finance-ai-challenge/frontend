import { sentimentTone } from "../utils/sentiment";

export function FilingSentimentDot({ sentiment }: { sentiment?: string | null }) {
  return <img className="filing-timeline-dot" src={`/assets/timeline-${sentimentTone(sentiment)}.svg`} alt="" />;
}
