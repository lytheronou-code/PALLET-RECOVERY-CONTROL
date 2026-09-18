import { describe, expect, it } from "vitest";
import { voucherSchema } from "@/lib/validation/voucher";

const valid = {
  counterpartyId: "11111111-1111-4111-8111-111111111111",
  palletTypeId: "22222222-2222-4222-8222-222222222222",
  voucherNumber: "BV-2026-001",
  issueDate: "2026-09-18",
  recoveryDueDate: "2026-10-18",
  quantity: 10,
  notes: "",
};

describe("voucherSchema", () => {
  it("accepts a valid voucher", () => {
    expect(voucherSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-positive quantity", () => {
    expect(voucherSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it("rejects a recovery date before issue date", () => {
    const result = voucherSchema.safeParse({ ...valid, recoveryDueDate: "2026-09-17" });
    expect(result.success).toBe(false);
  });

  it("allows an empty recovery due date", () => {
    expect(voucherSchema.safeParse({ ...valid, recoveryDueDate: "" }).success).toBe(true);
  });

  it("keeps date validation for edit payloads", async () => {
    const { voucherEditSchema } = await import("@/lib/validation/voucher");
    expect(voucherEditSchema.safeParse({
      voucherNumber: "BV-EDIT",
      issueDate: "2026-09-18",
      recoveryDueDate: "2026-09-17",
      quantity: 10,
      notes: "",
    }).success).toBe(false);
  });
});
