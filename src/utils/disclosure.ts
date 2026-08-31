import type { Filing } from "../types";

export type PublishedFiling = Filing & {
  titleEn: string;
  eventType: string;
  sentiment: string;
  importance: string;
  marketImpact: string;
};

export function isPublishedFiling(filing: Filing): filing is PublishedFiling {
  return Boolean(
    filing.titleEn?.trim()
      && filing.eventType?.trim()
      && filing.sentiment?.trim()
      && filing.importance?.trim()
      && filing.marketImpact?.trim(),
  );
}
