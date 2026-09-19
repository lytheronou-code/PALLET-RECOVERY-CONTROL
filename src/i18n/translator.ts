import type { Messages } from "@/i18n/dictionaries";

type Primitive = string | number | boolean;

// Recursively derive every dot-path that resolves to a string leaf, e.g.
// "auth.login.title". Gives autocomplete + compile-time typo checking for
// every t() call without hand-maintaining a key union.
type DotPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends Record<string, unknown>
    ? { [K in keyof T & string]: DotPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`> }[keyof T & string]
    : never;

export type TranslationKey = DotPaths<Messages>;

function lookup(dict: Messages, path: string): string {
  const value = path.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);

  if (typeof value !== "string") {
    // A missing/mistyped key must never crash a page in front of a real
    // user; surface it loudly in dev/test instead where it will be caught.
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Missing translation for key "${path}"`);
    }
    return path;
  }
  return value;
}

function interpolate(template: string, vars?: Record<string, Primitive>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type Translator = (key: TranslationKey, vars?: Record<string, Primitive>) => string;

export function createTranslator(dict: Messages): Translator {
  return (key, vars) => interpolate(lookup(dict, key), vars);
}
