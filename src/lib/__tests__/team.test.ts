import { describe, expect, it } from "vitest";
import { buildAddMemberSchema, ORGANIZATION_ROLES } from "@/lib/validation/team";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

const t = createTranslator(getDictionary("en"));
const addMemberSchema = buildAddMemberSchema(t);

describe("ORGANIZATION_ROLES", () => {
  it("matches the live organization_members_role_check constraint exactly (admin, operator, viewer)", () => {
    expect(ORGANIZATION_ROLES).toEqual(["admin", "operator", "viewer"]);
  });
});

describe("buildAddMemberSchema", () => {
  it("accepts a valid email + role", () => {
    const result = addMemberSchema.safeParse({ email: "teammate@example.com", role: "operator" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ email: "teammate@example.com", role: "operator" });
    }
  });

  it("accepts every supported role", () => {
    for (const role of ORGANIZATION_ROLES) {
      const result = addMemberSchema.safeParse({ email: "teammate@example.com", role });
      expect(result.success).toBe(true);
    }
  });

  it("trims the email", () => {
    const result = addMemberSchema.safeParse({ email: "  teammate@example.com  ", role: "admin" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("teammate@example.com");
    }
  });

  it("rejects a malformed email", () => {
    const result = addMemberSchema.safeParse({ email: "not-an-email", role: "operator" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported role", () => {
    const result = addMemberSchema.safeParse({ email: "teammate@example.com", role: "owner" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing role", () => {
    const result = addMemberSchema.safeParse({ email: "teammate@example.com" });
    expect(result.success).toBe(false);
  });
});
