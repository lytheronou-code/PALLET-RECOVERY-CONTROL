import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Independent-review requirement: a real static scan for hardcoded
 * user-facing strings in app/components, beyond en.json/it.json key
 * parity (which src/lib/__tests__/i18n-completeness.test.ts already
 * covers, but says nothing about whether a string was ever routed
 * through t() in the first place).
 *
 * This walks the real TypeScript AST (via the `typescript` package
 * already used for `tsc --noEmit`) rather than a regex over raw source
 * text, so it isn't fooled by strings that merely *look* like JSX, and
 * doesn't need fragile escaping tricks for quotes/braces/JSX
 * expressions. It flags two things:
 *   1. Non-whitespace JsxText (text directly between JSX tags).
 *   2. String/template literals assigned to a curated set of
 *      user-facing JSX attributes (placeholder, alt, title, aria-label).
 * Everything else (className, href, src, style, ids, event handlers,
 * component names, technical identifiers, etc.) is out of scope by
 * construction -- this scan is about visible copy, not markup plumbing.
 */

const USER_FACING_ATTRIBUTES = new Set(["placeholder", "alt", "title", "aria-label"]);

export type Finding = {
  file: string;
  line: number;
  text: string;
  kind: "jsx-text" | "attribute";
};

// Entries here are exact string matches (after trim) that the scan would
// otherwise flag but are deliberately not translatable copy -- each entry
// documents *why*. Keep this list short and specific (exact strings, not
// patterns) so it can never silently swallow a real hardcoded sentence;
// a new false positive should be fixed by tightening the scanner's own
// heuristics in shouldFlag() below, not by growing this list unless the
// string genuinely isn't UI prose.
const ALLOWLIST = new Set<string>([
  // Directional/status abbreviations, identical in every supported locale
  // by design (see movements.correctForm.fields.outbound: "OUT (outbound)"
  // for the one place these get a translated, spelled-out label).
  "OUT",
  "IN",
  // Pallet industry standard codes/dimensions -- not prose, identical in
  // every locale (same class of thing as a product SKU).
  "EPAL EUR1",
  "EPAL EUR2",
  "CP",
  "EPAL",
  "CHEP",
  "LPR",
  "GENERIC",
  // Example/placeholder values that are format examples, not sentences.
  "client@company.com",
  "#0F766E",
  "#0F172A",
  // Pallet-type description placeholder: a format example (a real
  // pallet's standard name + dimensions), not a sentence to translate --
  // same class as the EPAL/CHEP codes above.
  "Europallet EUR1 800x1200",
  // Product brand name in the sidebar -- deliberately not translated,
  // same treatment as the "Pallet Recovery Control" appName string in
  // the dictionaries themselves. The tagline next to it *is* translated
  // (t("nav.operationsDesk")).
  "Recovery Control",
]);

function isAllowedIdentifierLike(text: string): boolean {
  // No letters at all (pure punctuation/digits/symbols like "—", "·", "%").
  if (!/[A-Za-zÀ-ÿ]/.test(text)) return true;
  // Looks like a URL or path, not prose.
  if (/^(https?:|\/|#|\.\/)/i.test(text)) return true;
  // A bare interpolation with no literal prose around it, e.g. "{count}".
  if (/^\{[^{}]+\}$/.test(text)) return true;
  // Single short all-caps token (abbreviation/code), e.g. "OK", "N/A" --
  // deliberately narrow (short + no lowercase + no space) so real
  // multi-word ALL CAPS UI copy would still be caught.
  if (text.length <= 4 && text === text.toUpperCase() && !/\s/.test(text)) return true;
  return false;
}

function shouldFlag(rawText: string): boolean {
  const text = rawText.trim();
  if (text.length === 0) return false;
  if (ALLOWLIST.has(text)) return false;
  if (isAllowedIdentifierLike(text)) return false;
  return true;
}

function getAttributeName(node: ts.JsxAttribute): string {
  return node.name.getText();
}

function collectFindings(sourceFile: ts.SourceFile): Finding[] {
  const findings: Finding[] = [];

  function lineOf(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile);
      if (shouldFlag(text)) {
        findings.push({ file: sourceFile.fileName, line: lineOf(node), text: text.trim(), kind: "jsx-text" });
      }
    } else if (ts.isJsxAttribute(node)) {
      const attrName = getAttributeName(node);
      if (USER_FACING_ATTRIBUTES.has(attrName) && node.initializer) {
        let literalText: string | null = null;
        if (ts.isStringLiteral(node.initializer)) {
          literalText = node.initializer.text;
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteral(node.initializer.expression)
        ) {
          literalText = node.initializer.expression.text;
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isNoSubstitutionTemplateLiteral(node.initializer.expression)
        ) {
          literalText = node.initializer.expression.text;
        }
        if (literalText !== null && shouldFlag(literalText)) {
          findings.push({ file: sourceFile.fileName, line: lineOf(node), text: literalText.trim(), kind: "attribute" });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function listTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      results.push(...listTsxFiles(full));
    } else if (entry.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

export function scanDirectories(dirs: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const dir of dirs) {
    for (const file of listTsxFiles(dir)) {
      const text = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      findings.push(...collectFindings(sourceFile));
    }
  }
  return findings;
}
