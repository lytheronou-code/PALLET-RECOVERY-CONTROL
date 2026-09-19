"use client";

import { useMemo } from "react";
import { ALL_COUNTRY_CODES } from "@/lib/countries";
import { getLocalizedCountryOptions } from "@/lib/i18n/country-names";
import type { Locale } from "@/i18n/locale";

// Client-side-dependent translation (same pattern as import-wizard.tsx):
// this component always renders inside a "use client" form, so it takes
// the plain locale string (which can cross the server/client boundary)
// rather than a bound translator, and builds its own localized labels
// with useMemo. The rendered <option> TEXT is locale-aware; the stored
// VALUE is always the stable alpha-2 code, e.g. <option value="DE">Germania</option>.
export function CountrySelect({
  id,
  name,
  defaultValue,
  locale,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  locale: Locale;
}) {
  const options = useMemo(() => getLocalizedCountryOptions(ALL_COUNTRY_CODES, locale), [locale]);

  return (
    <select id={id} name={name} defaultValue={defaultValue || "IT"}>
      {options.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
