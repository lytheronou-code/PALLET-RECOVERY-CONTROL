// Pure, framework-free helpers for the documents/evidence feature: never
// trust the original filename for authorization (paths are built here,
// never accepted from the client), and validate the file itself
// server-side rather than trusting the browser's reported MIME type alone.

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

export type FileValidationResult = { valid: true } | { valid: false; error: string };

// Server-side re-validation of a file already accepted by the browser
// <input accept> and the Storage bucket's own allowed_mime_types/
// file_size_limit -- never trust the client alone, and never trust the
// browser-reported MIME type in isolation: it must also agree with the
// file's own extension, since a renamed executable can freely claim
// "image/png" as its MIME type.
export function validateDocumentFile(file: { type: string; size: number; name: string }): FileValidationResult {
  if (!file.name || !file.name.trim()) {
    return { valid: false, error: "Nome file mancante." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: "Il file è vuoto." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Il file supera la dimensione massima di 15 MB." };
  }
  if (!isAllowedMimeType(file.type)) {
    return { valid: false, error: "Formato non supportato. Usa PDF, JPG, PNG o WEBP." };
  }
  const extension = extensionOf(file.name);
  if (!MIME_EXTENSIONS[file.type].includes(extension)) {
    return { valid: false, error: "L'estensione del file non corrisponde al formato dichiarato." };
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
