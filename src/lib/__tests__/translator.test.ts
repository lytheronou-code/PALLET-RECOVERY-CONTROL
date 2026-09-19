import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";
import { coerceLocale, isLocale, DEFAULT_LOCALE } from "@/i18n/locale";

describe("createTranslator", () => {
  it("resolves nested dot-path keys per locale", () => {
    const tEn = createTranslator(getDictionary("en"));
    const tIt = createTranslator(getDictionary("it"));

    expect(tEn("auth.login.title")).toBe("Sign in");
    expect(tIt("auth.login.title")).toBe("Accedi");
  });

  it("interpolates {placeholder} variables", () => {
    const t = createTranslator(getDictionary("en"));
    expect(t("common.pagination.showingResults", { from: 1, to: 20, total: 42 })).toBe(
      "Showing 1–20 of 42",
    );
  });

  it("leaves unmatched placeholders untouched", () => {
    const t = createTranslator(getDictionary("en"));
    expect(t("common.pagination.showingResults", { from: 1 })).toContain("{to}");
  });
});

describe("locale guards", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("it")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("coerces unsupported values to the default locale", () => {
    expect(coerceLocale("it")).toBe("it");
    expect(coerceLocale("xx")).toBe(DEFAULT_LOCALE);
    expect(coerceLocale(null)).toBe(DEFAULT_LOCALE);
  });
});
