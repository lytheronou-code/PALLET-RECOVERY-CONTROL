// Pure, framework-free helpers for the documents/evidence feature: never
// trust the original filename for authorization (paths are built here,
// never accepted from the client), and validate the file itself
// server-side rather than trusting the browser's reported MIME type alone.
//
// validateDocumentFile takes a Translator (same idiom as the
// buildXSchema(t) Zod factories elsewhere in this codebase) so its
// per-reason error messages -- which land directly in formState.error --
// are locale-resolved rather than hardcoded, while staying pure/sync and
// directly unit-testable.
import type { Translator } from "@/i18n/translator";

export const DOCUMENT_ENTITIES = [
  "counterparty",
  "site",
  "movement",
  "voucher",
  "recovery-case",
  "recovery-event",
] as const;

export type DocumentEntity = (typeof DOCUMENT_ENTITIES)[number];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMimeType, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// Strips path separators and anything that isn't a conservative filename
// character, so a filename can never be used to escape the intended
// storage path segment (e.g. "../../other-org/secret.pdf") or inject
// control characters. The result is cosmetic only -- it is never the
// authorization mechanism, just what a human sees in the UI/downloaded
// file.
export function sanitizeFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() ?? "";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  const trimmed = safe.replace(/^\.+/, "").slice(0, 120);
  return trimmed || "file";
}

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

function extensionOf(filename: string): string {
  const parts = filename.trim().split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

// Magic-byte signatures: a renamed executable can freely claim any MIME
// type AND any extension (both are just strings the uploader controls),
// but it cannot fake the file's own leading bytes without also being a
// genuinely valid file of that format. This is the one check in the
// pipeline that inspects real file content rather than metadata about it.
const MAGIC_BYTES_BY_MIME: Record<AllowedMimeType, (header: Uint8Array) => boolean> = {
  "application/pdf": (header) => matchesSignature(header, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  "image/jpeg": (header) => matchesSignature(header, [0xff, 0xd8, 0xff]),
  "image/png": (header) => matchesSignature(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": (header) =>
    matchesSignature(header, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    matchesSignature(header.subarray(8), [0x57, 0x45, 0x42, 0x50]), // "WEBP" at offset 8
};

// WEBP's signature spans bytes 8-11 (after the 4-byte RIFF chunk size),
// so this is the minimum header length that lets every format above be
// checked in one read.
export const MAGIC_BYTES_HEADER_LENGTH = 12;

function matchesSignature(header: Uint8Array, signature: number[]): boolean {
  if (header.length < signature.length) return false;
  return signature.every((byte, index) => header[index] === byte);
}

// Pure and synchronous so it's directly unit-testable with constructed
// byte arrays, independent of how the header bytes were read.
export function matchesFileSignature(header: Uint8Array, mimeType: string): boolean {
  const check = MAGIC_BYTES_BY_MIME[mimeType as AllowedMimeType];
  return check ? check(header) : false;
}

// Reads only the leading bytes needed for signature detection -- never
// the full (up to 15MB) file -- via File.slice(), which does not load
// the rest of the file into memory.
export async function readFileHeader(file: File, length: number = MAGIC_BYTES_HEADER_LENGTH): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

export type FileValidationResult = { valid: true } | { valid: false; error: string };

// Server-side re-validation of a file already accepted by the browser
// <input accept> and the Storage bucket's own allowed_mime_types/
// file_size_limit -- never trust the client alone, and never trust the
// browser-reported MIME type in isolation: it must also agree with the
// file's own extension, since a renamed executable can freely claim
// "image/png" as its MIME type.
export function validateDocumentFile(
  file: { type: string; size: number; name: string },
  t: Translator,
): FileValidationResult {
  if (!file.name || !file.name.trim()) {
    return { valid: false, error: t("documents.errors.missingFilename") };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: t("documents.errors.emptyFile") };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: t("documents.errors.fileTooLarge") };
  }
  if (!isAllowedMimeType(file.type)) {
    return { valid: false, error: t("documents.errors.unsupportedFormat") };
  }
  const extension = extensionOf(file.name);
  if (!MIME_EXTENSIONS[file.type].includes(extension)) {
    return { valid: false, error: t("documents.errors.extensionMismatch") };
  }
  return { valid: true };
}

// {organization_id}/{counterparty_id}/{entity}/{entity_id}/{uuid}-{safe_filename}
export function buildDocumentStoragePath(params: {
  organizationId: string;
  counterpartyId: string;
  entity: DocumentEntity;
  entityId: string;
  filename: string;
}): string {
  const safeFilename = sanitizeFilename(params.filename);
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return [
    params.organizationId,
    params.counterpartyId,
    params.entity,
    params.entityId,
    `${uniqueId}-${safeFilename}`,
  ].join("/");
}
