import { useLocale } from "../state/LocaleContext";
import type { SupportedCountry } from "../types";
import { countryOptions } from "../utils/countryOptions";

export function CountryOptions({ countries }: { countries: readonly SupportedCountry[] }) {
  const { locale } = useLocale();
  return countryOptions(countries, locale).map((country) => <option
    value={country.countryCode}
    disabled={!country.selectable}
    key={country.countryCode}
  >
    {country.countryName}{country.selectable ? "" : locale === "ko" ? " · 준비 중" : " · Coming soon"}
  </option>);
}
