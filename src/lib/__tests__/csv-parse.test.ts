import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";

describe("parseCsv", () => {
  it("parses a simple comma-delimited CSV", () => {
    const result = parseCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(result.headers).toEqual(["a", "b", "c"]);
    expect(result.rows).toEqual([
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("auto-detects semicolon delimiter", () => {
    const result = parseCsv("a;b;c\n1;2;3\n");
    expect(result.headers).toEqual(["a", "b", "c"]);
    expect(result.rows).toEqual([["1", "2", "3"]]);
  });

  it("handles quoted fields with embedded commas", () => {
    const result = parseCsv('name,note\n"Acme, Inc.","hello ""world"""\n');
    expect(result.headers).toEqual(["name", "note"]);
    expect(result.rows).toEqual([["Acme, Inc.", 'hello "world"']]);
  });

  it("strips a UTF-8 BOM and normalizes CRLF line endings", () => {
    const result = parseCsv("﻿a,b\r\n1,2\r\n");
    expect(result.headers).toEqual(["a", "b"]);
    expect(result.rows).toEqual([["1", "2"]]);
  });

  it("skips blank trailing lines", () => {
    const result = parseCsv("a,b\n1,2\n\n");
    expect(result.rows).toEqual([["1", "2"]]);
  });
});
