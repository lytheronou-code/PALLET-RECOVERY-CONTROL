import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  MAGIC_BYTES_HEADER_LENGTH,
  MAX_FILE_SIZE_BYTES,
  buildDocumentStoragePath,
  isAllowedMimeType,
  matchesFileSignature,
  sanitizeFilename,
  validateDocumentFile,
} from "@/lib/documents/storage-path";

const REAL_HEADERS: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37], // "%PDF-1.7"
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
};

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

describe("matchesFileSignature", () => {
  it("accepts every allowed format's real magic bytes", () => {
    for (const [mimeType, header] of Object.entries(REAL_HEADERS)) {
      expect(matchesFileSignature(new Uint8Array(header), mimeType)).toBe(true);
    }
  });

  it("rejects an executable renamed and mis-declared as image/png (MIME + extension both spoofed)", () => {
    // MZ header -- a Windows PE executable -- claiming to be image/png.
    const header = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(matchesFileSignature(header, "image/png")).toBe(false);
  });

  it("rejects valid MIME + valid extension but wrong/absent signature", () => {
    // A plain text file's bytes, declared as application/pdf.
    const header = new Uint8Array(Array.from("not a real pdf").map((c) => c.charCodeAt(0)));
    expect(matchesFileSignature(header, "application/pdf")).toBe(false);
  });

  it("rejects a header that is too short to contain the signature", () => {
    expect(matchesFileSignature(new Uint8Array([0x25, 0x50]), "application/pdf")).toBe(false);
    expect(matchesFileSignature(new Uint8Array(0), "image/webp")).toBe(false);
  });

  it("rejects WEBP when RIFF is present but the WEBP tag at offset 8 is missing", () => {
    const header = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]); // "AVI "
    expect(matchesFileSignature(header, "image/webp")).toBe(false);
  });

  it("rejects an unknown/unsupported MIME type outright", () => {
    expect(matchesFileSignature(new Uint8Array(REAL_HEADERS["application/pdf"]), "application/zip")).toBe(false);
  });

  it("only needs MAGIC_BYTES_HEADER_LENGTH bytes to decide every format", () => {
    for (const [mimeType, header] of Object.entries(REAL_HEADERS)) {
      const truncated = new Uint8Array(header).subarray(0, MAGIC_BYTES_HEADER_LENGTH);
      expect(matchesFileSignature(truncated, mimeType)).toBe(true);
    }
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
