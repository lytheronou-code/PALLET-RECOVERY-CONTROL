// Logo upload validation, mirroring src/lib/documents/storage-path.ts's
// magic-byte approach but scoped to a much smaller, presentation-only file
// set: PNG/JPEG/WEBP only. SVG is deliberately not supported -- an SVG can
// embed <script>, making "safely sanitized" a real parsing/sanitization
// project rather than a format check, which is not justified for a v1
// logo upload.

export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

const LOGO_EXTENSIONS: Record<LogoMimeType, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

// Small on purpose: this is a UI logo rendered at a few dozen pixels tall,
// not evidence -- 2 MB is generous for that and keeps portal page loads fast.
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

function matchesSignature(header: Uint8Array, signature: number[]): boolean {
  if (header.length < signature.length) return false;
  return signature.every((byte, index) => header[index] === byte);
}

const LOGO_MAGIC_BYTES: Record<LogoMimeType, (header: Uint8Array) => boolean> = {
  "image/png": (header) => matchesSignature(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (header) => matchesSignature(header, [0xff, 0xd8, 0xff]),
  "image/webp": (header) =>
    matchesSignature(header, [0x52, 0x49, 0x46, 0x46]) &&
    matchesSignature(header.subarray(8), [0x57, 0x45, 0x42, 0x50]),
};

export const LOGO_MAGIC_BYTES_HEADER_LENGTH = 12;

export function isAllowedLogoMimeType(mimeType: string): mimeType is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(mimeType);
}

function extensionOf(filename: string): string {
  const parts = filename.trim().split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

export function matchesLogoFileSignature(header: Uint8Array, mimeType: string): boolean {
  const check = LOGO_MAGIC_BYTES[mimeType as LogoMimeType];
  return check ? check(header) : false;
}

export async function readLogoFileHeader(
  file: File,
  length: number = LOGO_MAGIC_BYTES_HEADER_LENGTH,
): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

export type LogoValidationResult = { valid: true } | { valid: false; error: string };

export function validateLogoFile(file: { type: string; size: number; name: string }): LogoValidationResult {
  if (!file.name || !file.name.trim()) {
    return { valid: false, error: "missing filename" };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: "empty file" };
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return { valid: false, error: "file too large" };
  }
  if (!isAllowedLogoMimeType(file.type)) {
    return { valid: false, error: "unsupported format" };
  }
  const extension = extensionOf(file.name);
  if (!LOGO_EXTENSIONS[file.type].includes(extension)) {
    return { valid: false, error: "extension does not match declared format" };
  }
  return { valid: true };
}

function sanitizeFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() ?? "";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  const trimmed = safe.replace(/^\.+/, "").slice(0, 120);
  return trimmed || "logo";
}

// {organization_id}/{uuid}-{safe_filename}
export function buildBrandingLogoPath(params: { organizationId: string; filename: string }): string {
  const safeFilename = sanitizeFilename(params.filename);
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return [params.organizationId, `${uniqueId}-${safeFilename}`].join("/");
}
