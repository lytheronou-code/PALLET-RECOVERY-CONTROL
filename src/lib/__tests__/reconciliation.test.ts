import { describe, expect, it } from "vitest";
import { reconcile, type MovementInput, type VoucherInput } from "@/lib/reconciliation/engine";

const counterparties = [{ id: "cp-1", legalName: "Acme Srl" }];
const palletTypes = [{ id: "pt-1", code: "EPAL EUR1", unitValue: 12 }];

function movement(overrides: Partial<MovementInput>): MovementInput {
  return {
    id: "m-1",
    counterpartyId: "cp-1",
    palletTypeId: "pt-1",
    direction: "outbound",
    quantity: 10,
    documentNumber: "DDT-1",
    ...overrides,
  };
}

function voucher(overrides: Partial<VoucherInput>): VoucherInput {
  return {
    id: "v-1",
    counterpartyId: "cp-1",
    palletTypeId: "pt-1",
    quantity: 10,
    recoveredQuantity: 0,
    status: "open",
    recoveryDueDate: null,
    ...overrides,
  };
}

describe("reconcile — balances", () => {
  it("computes theoretical balance as outbound minus inbound", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", direction: "outbound", quantity: 30, documentNumber: "A" }),
        movement({ id: "m-2", direction: "inbound", quantity: 12, documentNumber: "B" }),
      ],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.balances).toHaveLength(1);
    expect(result.balances[0].outboundQuantity).toBe(30);
    expect(result.balances[0].inboundQuantity).toBe(12);
    expect(result.balances[0].theoreticalBalance).toBe(18);
    expect(result.balances[0].outstandingQuantity).toBe(18);
    expect(result.balances[0].outstandingValue).toBe(18 * 12);
  });

  it("clamps outstanding quantity at zero when inbound exceeds outbound", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", direction: "outbound", quantity: 5, documentNumber: "A" }),
        movement({ id: "m-2", direction: "inbound", quantity: 8, documentNumber: "B" }),
      ],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.balances[0].theoreticalBalance).toBe(-3);
    expect(result.balances[0].outstandingQuantity).toBe(0);
    expect(result.balances[0].outstandingValue).toBe(0);
  });

  it("groups separately per counterparty and per pallet type", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", counterpartyId: "cp-1", palletTypeId: "pt-1", quantity: 10, documentNumber: "A" }),
        movement({ id: "m-2", counterpartyId: "cp-2", palletTypeId: "pt-1", quantity: 5, documentNumber: "B" }),
      ],
      [],
      [...counterparties, { id: "cp-2", legalName: "Beta Spa" }],
      palletTypes,
    );
    expect(result.balances).toHaveLength(2);
  });

  it("sorts balances by outstanding value descending", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", counterpartyId: "cp-1", quantity: 5, documentNumber: "A" }),
        movement({ id: "m-2", counterpartyId: "cp-2", quantity: 50, documentNumber: "B" }),
      ],
      [],
      [...counterparties, { id: "cp-2", legalName: "Beta Spa" }],
      palletTypes,
    );
    expect(result.balances[0].counterpartyId).toBe("cp-2");
  });

  it("tracks voucherOpenQuantity separately from the movement-based balance", () => {
    const result = reconcile(
      [movement({ id: "m-1", quantity: 20, documentNumber: "A" })],
      [voucher({ id: "v-1", quantity: 10, recoveredQuantity: 4, status: "partial" })],
      counterparties,
      palletTypes,
    );
    expect(result.balances[0].theoreticalBalance).toBe(20);
    expect(result.balances[0].voucherOpenQuantity).toBe(6);
  });
});

describe("reconcile — findings", () => {
  it("flags an unbalanced movement group", () => {
    const result = reconcile(
      [movement({ id: "m-1", quantity: 10, documentNumber: "A" })],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "unbalanced_movements", outstandingQuantity: 10 }),
    );
  });

  it("does not flag unbalanced movements when the ledger is fully balanced", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", direction: "outbound", quantity: 10, documentNumber: "A" }),
        movement({ id: "m-2", direction: "inbound", quantity: 10, documentNumber: "B" }),
      ],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.findings.some((f) => f.type === "unbalanced_movements")).toBe(false);
  });

  it("flags every open or partial voucher", () => {
    const result = reconcile(
      [],
      [voucher({ id: "v-1", status: "open" }), voucher({ id: "v-2", status: "closed" })],
      counterparties,
      palletTypes,
    );
    const openFindings = result.findings.filter((f) => f.type === "open_voucher");
    expect(openFindings).toHaveLength(1);
    expect((openFindings[0] as { voucherId: string }).voucherId).toBe("v-1");
  });

  it("flags a voucher due within the lookahead window as due soon", () => {
    const today = new Date("2026-03-01T00:00:00Z");
    const result = reconcile(
      [],
      [voucher({ id: "v-1", status: "open", recoveryDueDate: "2026-03-10" })],
      counterparties,
      palletTypes,
      today,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "voucher_due_soon", voucherId: "v-1", daysUntilDue: 9 }),
    );
  });

  it("flags a past-due open voucher as overdue", () => {
    const today = new Date("2026-03-15T00:00:00Z");
    const result = reconcile(
      [],
      [voucher({ id: "v-1", status: "open", recoveryDueDate: "2026-03-01" })],
      counterparties,
      palletTypes,
      today,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "voucher_overdue", voucherId: "v-1", daysOverdue: 14 }),
    );
  });

  it("does not flag due date findings for closed vouchers", () => {
    const today = new Date("2026-03-15T00:00:00Z");
    const result = reconcile(
      [],
      [voucher({ id: "v-1", status: "closed", recoveryDueDate: "2026-03-01" })],
      counterparties,
      palletTypes,
      today,
    );
    expect(result.findings.some((f) => f.type === "voucher_overdue" || f.type === "voucher_due_soon")).toBe(false);
  });

  it("flags a movement with missing documentation", () => {
    const result = reconcile(
      [movement({ id: "m-1", documentNumber: null })],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: "missing_documentation", movementId: "m-1" }),
    );
  });

  it("flags duplicate documents sharing counterparty, pallet type, direction and document number", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", documentNumber: "DDT-1" }),
        movement({ id: "m-2", documentNumber: "ddt-1" }),
      ],
      [],
      counterparties,
      palletTypes,
    );
    const duplicate = result.findings.find((f) => f.type === "duplicate_document");
    expect(duplicate).toBeDefined();
    expect((duplicate as { movementIds: string[] }).movementIds).toEqual(["m-1", "m-2"]);
  });

  it("does not flag distinct document numbers as duplicates", () => {
    const result = reconcile(
      [movement({ id: "m-1", documentNumber: "DDT-1" }), movement({ id: "m-2", documentNumber: "DDT-2" })],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.findings.some((f) => f.type === "duplicate_document")).toBe(false);
  });

  it("does not treat same document number for a different direction as a duplicate", () => {
    const result = reconcile(
      [
        movement({ id: "m-1", direction: "outbound", documentNumber: "DDT-1" }),
        movement({ id: "m-2", direction: "inbound", documentNumber: "DDT-1" }),
      ],
      [],
      counterparties,
      palletTypes,
    );
    expect(result.findings.some((f) => f.type === "duplicate_document")).toBe(false);
  });
});
