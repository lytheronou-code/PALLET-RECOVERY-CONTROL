import { describe, expect, it as test } from "vitest";
import en from "@/i18n/messages/en.json";
import itMessages from "@/i18n/messages/it.json";
import { SUPPORTED_LOCALES } from "@/i18n/locale";

type JsonNode = string | { [key: string]: JsonNode };

function collectKeyPaths(node: JsonNode, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

// Fails CI the moment en.json and it.json drift out of key-parity, which is
// the one thing TypeScript's JSON import typing does NOT catch (it types
// the whole dictionary as `typeof en`, so a missing it.json key silently
// falls back to `undefined` at runtime instead of a compile error).
describe("i18n dictionary completeness", () => {
  test("declares both supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "it"]);
  });

  test("has an identical key set in en.json and it.json", () => {
    const enKeys = new Set(collectKeyPaths(en));
    const itKeys = new Set(collectKeyPaths(itMessages));

    const missingFromIt = [...enKeys].filter((key) => !itKeys.has(key)).sort();
    const missingFromEn = [...itKeys].filter((key) => !enKeys.has(key)).sort();

    expect(missingFromIt, "keys present in en.json but missing from it.json").toEqual([]);
    expect(missingFromEn, "keys present in it.json but missing from en.json").toEqual([]);
  });

  test("has no empty translation values in either locale", () => {
    const emptyIn = (node: JsonNode, prefix = ""): string[] =>
      typeof node === "string"
        ? node.trim().length === 0
          ? [prefix]
          : []
        : Object.entries(node).flatMap(([key, value]) =>
            emptyIn(value, prefix ? `${prefix}.${key}` : key),
          );

    expect(emptyIn(en)).toEqual([]);
    expect(emptyIn(itMessages)).toEqual([]);
  });
});
