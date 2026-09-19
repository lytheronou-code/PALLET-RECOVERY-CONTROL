import en from "@/i18n/messages/en.json";
import it from "@/i18n/messages/it.json";
import type { Locale } from "@/i18n/locale";

// en.json is the canonical shape; it.json is structurally validated against
// it by the completeness test in src/lib/__tests__/i18n-completeness.test.ts
// rather than by TypeScript (JSON imports don't get key-parity checking).
export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = { en, it: it as Messages };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale];
}
