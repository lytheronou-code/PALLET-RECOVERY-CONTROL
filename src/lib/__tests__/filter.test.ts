import { describe, expect, it } from "vitest";
import { sanitizeOrSearchTerm } from "@/lib/supabase/filter";

describe("sanitizeOrSearchTerm", () => {
  it("passes ordinary terms through unchanged", () => {
    expect(sanitizeOrSearchTerm("Acme Srl")).toBe("Acme Srl");
  });

  it("strips commas and parentheses that are significant in PostgREST or() syntax", () => {
    expect(sanitizeOrSearchTerm("foo,and.status.eq.approved")).toBe("foo and.status.eq.approved");
    expect(sanitizeOrSearchTerm("Acme (Italia), Srl")).toBe("Acme  Italia   Srl");
  });

  it("escapes SQL LIKE wildcards so they are matched literally", () => {
    expect(sanitizeOrSearchTerm("100%_done")).toBe("100\\%\\_done");
  });

  it("trims surrounding whitespace before escaping", () => {
    expect(sanitizeOrSearchTerm("  Acme  ")).toBe("Acme");
  });
});
