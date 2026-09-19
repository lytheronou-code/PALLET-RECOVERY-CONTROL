"use client";

import { usePathname } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/locale";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locale";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  it: "IT",
};

export function LanguageSwitcher({ locale, ariaLabel }: { locale: Locale; ariaLabel: string }) {
  const pathname = usePathname();

  return (
    <div className="language-switcher" role="group" aria-label={ariaLabel}>
      {SUPPORTED_LOCALES.map((option) => (
        <form key={option} action={setLocaleAction}>
          <input type="hidden" name="locale" value={option} />
          <input type="hidden" name="path" value={pathname} />
          <button
            type="submit"
            className={option === locale ? "language-option active" : "language-option"}
            aria-pressed={option === locale}
            disabled={option === locale}
          >
            {LOCALE_LABEL[option]}
          </button>
        </form>
      ))}
    </div>
  );
}
