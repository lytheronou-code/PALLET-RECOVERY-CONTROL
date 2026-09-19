import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_LABEL_KEYS,
  buildUploadDocumentSchema,
  documentTypeLabel,
} from "@/lib/validation/document";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

const t = createTranslator(getDictionary("en"));
const uploadDocumentSchema = buildUploadDocumentSchema(t);

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

  it("has a legacy Italian label for every document type", () => {
    for (const documentType of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABELS[documentType]).toBeTruthy();
    }
  });

  it("has a translation key for every document type, resolving to a non-empty label in every locale", () => {
    const tIt = createTranslator(getDictionary("it"));
    for (const documentType of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABEL_KEYS[documentType]).toBeTruthy();
      expect(documentTypeLabel(t, documentType)).toBeTruthy();
      expect(documentTypeLabel(tIt, documentType)).toBeTruthy();
    }
  });
});
