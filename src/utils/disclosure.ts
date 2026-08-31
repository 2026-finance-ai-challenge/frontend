import type { Filing } from "../types";

export type PublishedFiling = Filing & {
  titleKo: string;
};

export function isPublishedFiling(filing: Filing): filing is PublishedFiling {
  return Boolean(filing.receiptNumber?.trim() && filing.titleKo?.trim());
}
