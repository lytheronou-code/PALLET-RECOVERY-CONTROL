import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, uploadDocumentSchema } from "@/lib/validation/document";

describe("uploadDocumentSchema", () => {
  it("accepts every declared document type with no notes", () => {
    for (const documentType of DOCUMENT_TYPES) {
      const result = uploadDocumentSchema.safeParse({ documentType, notes: "" });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional trimmed notes", () => {
    const result = uploadDocumentSchema.safeParse({ documentType: "ddt", notes: "  consegna parziale  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("consegna parziale");
    }
  });

  it("rejects an unknown document type", () => {
    const result = uploadDocumentSchema.safeParse({ documentType: "invoice", notes: "" });
    expect(result.success).toBe(false);
  });

  it("rejects notes over the max length", () => {
    const result = uploadDocumentSchema.safeParse({ documentType: "other", notes: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("has an Italian label for every document type", () => {
    for (const documentType of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABELS[documentType]).toBeTruthy();
    }
  });
});
