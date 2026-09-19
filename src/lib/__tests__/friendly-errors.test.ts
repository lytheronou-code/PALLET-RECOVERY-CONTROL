import { describe, expect, it } from "vitest";
import { mapDatabaseError } from "@/lib/errors/friendly";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

const tEn = createTranslator(getDictionary("en"));
const tIt = createTranslator(getDictionary("it"));

describe("mapDatabaseError", () => {
  it("maps a unique-violation code to a friendly duplicate message", () => {
    expect(mapDatabaseError({ code: "23505", message: 'duplicate key value violates unique constraint "counterparties_org_code_key"' }, tEn)).toBe(
      "A record with these details already exists.",
    );
    expect(mapDatabaseError({ code: "23505", message: "dup" }, tIt)).toBe("Esiste già un record con questi dati.");
  });

  it("maps an RLS/permission denial to a friendly forbidden message, never the raw policy text", () => {
    const raw = { message: 'new row violates row-level security policy for table "organizations"' };
    expect(mapDatabaseError(raw, tEn)).toBe("You do not have permission to perform this action.");
    expect(mapDatabaseError(raw, tEn)).not.toContain("row-level security");
  });

  it("falls back to a generic message for anything else, never leaking the raw error", () => {
    const raw = { code: "42501", message: "permission denied for table organizations" };
    expect(mapDatabaseError(raw, tEn)).toBe("You do not have permission to perform this action.");

    const unknown = { code: "22P02", message: 'invalid input syntax for type uuid: "not-a-uuid"' };
    const result = mapDatabaseError(unknown, tEn);
    expect(result).not.toContain("uuid");
    expect(result).not.toContain("22P02");
  });

  it("handles a missing error object", () => {
    expect(mapDatabaseError(null, tEn)).toBe("Something went wrong. Please try again.");
    expect(mapDatabaseError(undefined, tEn)).toBe("Something went wrong. Please try again.");
  });
});
