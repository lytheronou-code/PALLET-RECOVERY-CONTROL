import { describe, expect, it } from "vitest";
import { counterpartySchema, palletTypeSchema } from "@/lib/validation/master-data";

describe("counterpartySchema", () => {
  it("accepts a minimal valid counterparty and defaults countryCode", () => {
    const result = counterpartySchema.safeParse({
      legalName: "Acme Logistics",
      counterpartyType: "customer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryCode).toBe("IT");
    }
  });

  it("uppercases a lowercase country code", () => {
    const result = counterpartySchema.safeParse({
      legalName: "Acme Logistics",
      counterpartyType: "customer",
      countryCode: "it",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryCode).toBe("IT");
    }
  });

  it("rejects an empty legal name", () => {
    const result = counterpartySchema.safeParse({
      legalName: "",
      counterpartyType: "customer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = counterpartySchema.safeParse({
      legalName: "Acme Logistics",
      counterpartyType: "customer",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("palletTypeSchema", () => {
  it("coerces a string unit value from form data", () => {
    const result = palletTypeSchema.safeParse({
      code: "EPAL-EUR1",
      description: "Europallet EUR1",
      unitValue: "12.50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitValue).toBe(12.5);
    }
  });

  it("rejects a negative unit value", () => {
    const result = palletTypeSchema.safeParse({
      code: "EPAL-EUR1",
      description: "Europallet EUR1",
      unitValue: "-1",
    });
    expect(result.success).toBe(false);
  });
});
