import type { SupportedCountry } from "../types";

const SELECTABLE_COUNTRIES = new Set(["US"]);

export function countryOptions(countries: readonly SupportedCountry[], locale: string) {
  const compareNames = new Intl.Collator(locale, { sensitivity: "base" }).compare;
  return countries.map((country) => ({ ...country, selectable: SELECTABLE_COUNTRIES.has(country.countryCode) }))
    .sort((a, b) => Number(b.selectable) - Number(a.selectable)
      || compareNames(a.countryName, b.countryName)
      || a.countryCode.localeCompare(b.countryCode));
}
