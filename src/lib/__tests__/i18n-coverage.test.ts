import { describe, expect, it } from "vitest";
import path from "node:path";
import { scanDirectories } from "@/lib/i18n/coverage-scan";

// Independent-review requirement: en.json/it.json key parity
// (i18n-completeness.test.ts) only proves the two dictionaries agree with
// each other -- it says nothing about whether a page ever routes its text
// through t() in the first place. This scans the real JSX AST of every
// .tsx file under src/app and src/components for hardcoded user-facing
// text (JSX children, and placeholder/alt/title/aria-label attributes)
// that isn't in the documented allowlist in coverage-scan.ts.
//
// A failure here means either: a real hardcoded string slipped back in
// (fix it -- route it through t() and a dictionary key), or a new
// legitimate non-translatable token was added (add it to ALLOWLIST in
// coverage-scan.ts with a one-line reason, not a broad pattern).
describe("i18n translation coverage (static scan)", () => {
  it("has no hardcoded user-facing strings outside the documented allowlist", () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    const findings = scanDirectories([path.join(root, "src/app"), path.join(root, "src/components")]);

    if (findings.length > 0) {
      const report = findings
        .map((f) => `  ${path.relative(root, f.file)}:${f.line} [${f.kind}] ${JSON.stringify(f.text)}`)
        .join("\n");
      throw new Error(
        `Found ${findings.length} hardcoded user-facing string(s) not routed through t():\n${report}\n\n` +
          `Fix each one by using t("namespace.key") with a dictionary entry, or -- only if it is ` +
          `genuinely not translatable prose (a code, abbreviation, or format example) -- add the exact ` +
          `string to ALLOWLIST in src/lib/i18n/coverage-scan.ts with a one-line reason.`,
      );
    }

    expect(findings).toEqual([]);
  });
});
