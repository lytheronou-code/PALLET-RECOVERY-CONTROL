import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  buildDocumentStoragePath,
  isAllowedMimeType,
  sanitizeFilename,
  validateDocumentFile,
} from "@/lib/documents/storage-path";

describe("sanitizeFilename", () => {
  it("keeps a conservative filename unchanged", () => {
    expect(sanitizeFilename("ddt-2026-01.pdf")).toBe("ddt-2026-01.pdf");
  });

  it("strips path separators so it cannot escape its storage segment", () => {
    expect(sanitizeFilename("../../other-org/secret.pdf")).not.toContain("/");
    expect(sanitizeFilename("..\\..\\secret.pdf")).not.toContain("\\");
  });

  it("replaces unsafe characters and collapses repeats", () => {
    expect(sanitizeFilename("bolla di reso #7 (finale).pdf")).toBe("bolla_di_reso_7_finale_.pdf");
  });

  it("strips leading dots so it cannot become a hidden/relative file", () => {
    expect(sanitizeFilename("...secret.pdf")).toBe("secret.pdf");
  });

  it("caps length at 120 characters", () => {
    const long = "a".repeat(200) + ".pdf";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(120);
  });

  it("falls back to a default name when nothing safe remains", () => {
    expect(sanitizeFilename("///...")).toBe("file");
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("isAllowedMimeType", () => {
  it("accepts every allowlisted MIME type", () => {
    for (const type of ALLOWED_MIME_TYPES) {
      expect(isAllowedMimeType(type)).toBe(true);
    }
  });

  it("rejects executables and other disallowed types", () => {
    expect(isAllowedMimeType("application/x-msdownload")).toBe(false);
    expect(isAllowedMimeType("text/html")).toBe(false);
    expect(isAllowedMimeType("application/octet-stream")).toBe(false);
  });
});

describe("validateDocumentFile", () => {
  it("accepts a valid PDF", () => {
    expect(validateDocumentFile({ type: "application/pdf", size: 1024, name: "ddt.pdf" })).toEqual({ valid: true });
  });

  it("accepts a valid JPEG with either extension spelling", () => {
    expect(validateDocumentFile({ type: "image/jpeg", size: 1024, name: "photo.jpg" }).valid).toBe(true);
    expect(validateDocumentFile({ type: "image/jpeg", size: 1024, name: "photo.jpeg" }).valid).toBe(true);
  });

  it("rejects a missing filename", () => {
    const result = validateDocumentFile({ type: "application/pdf", size: 1024, name: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateDocumentFile({ type: "application/pdf", size: 0, name: "ddt.pdf" });
    expect(result.valid).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateDocumentFile({
      type: "application/pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
      name: "ddt.pdf",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a disallowed MIME type even with a matching extension", () => {
    const result = validateDocumentFile({ type: "application/zip", size: 1024, name: "archive.zip" });
    expect(result.valid).toBe(false);
  });

  it("rejects a MIME type that doesn't match the file extension", () => {
    // Declares image/png but names itself .pdf -- a renamed-executable style mismatch.
    const result = validateDocumentFile({ type: "image/png", size: 1024, name: "invoice.pdf" });
    expect(result.valid).toBe(false);
  });

  it("rejects an executable disguised with an image MIME type", () => {
    const result = validateDocumentFile({ type: "image/png", size: 1024, name: "payload.exe" });
    expect(result.valid).toBe(false);
  });
});

describe("buildDocumentStoragePath", () => {
  it("builds a deterministic org/counterparty/entity/entityId/uuid-filename path", () => {
    const path = buildDocumentStoragePath({
      organizationId: "org-1",
      counterpartyId: "cp-1",
      entity: "recovery-case",
      entityId: "case-1",
      filename: "prova.pdf",
    });
    const segments = path.split("/");
    expect(segments[0]).toBe("org-1");
    expect(segments[1]).toBe("cp-1");
    expect(segments[2]).toBe("recovery-case");
    expect(segments[3]).toBe("case-1");
    expect(segments[4]).toMatch(/^[0-9a-f-]{36}-prova\.pdf$/);
  });

  it("sanitizes the filename segment so path traversal cannot leak into it", () => {
    const path = buildDocumentStoragePath({
      organizationId: "org-1",
      counterpartyId: "cp-1",
      entity: "voucher",
      entityId: "voucher-1",
      filename: "../../secret.pdf",
    });
    expect(path.split("/")).toHaveLength(5);
    expect(path).not.toContain("..");
  });

  it("produces a unique path for repeated calls with the same filename", () => {
    const params = {
      organizationId: "org-1",
      counterpartyId: "cp-1",
      entity: "movement" as const,
      entityId: "movement-1",
      filename: "ddt.pdf",
    };
    expect(buildDocumentStoragePath(params)).not.toBe(buildDocumentStoragePath(params));
  });
});
