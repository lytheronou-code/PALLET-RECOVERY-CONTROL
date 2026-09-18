import { describe, expect, it } from "vitest";
import { computeRecoveryUpdate, remainingQuantity, type RecoveryCaseState } from "@/lib/recovery/quantity";

const openCase: RecoveryCaseState = { quantityClaimed: 20, quantityRecovered: 0, status: "open" };

describe("remainingQuantity", () => {
  it("returns claimed minus recovered", () => {
    expect(remainingQuantity({ quantityClaimed: 20, quantityRecovered: 8, status: "partial" })).toBe(12);
  });

  it("never goes negative", () => {
    expect(remainingQuantity({ quantityClaimed: 5, quantityRecovered: 5, status: "recovered" })).toBe(0);
  });
});

describe("computeRecoveryUpdate — partial_recovery", () => {
  it("accumulates onto existing quantity_recovered and sets status to partial", () => {
    const result = computeRecoveryUpdate(
      { quantityClaimed: 20, quantityRecovered: 8, status: "partial" },
      { type: "partial_recovery", quantity: 5 },
    );
    expect(result).toEqual({ ok: true, update: { quantityRecovered: 13, status: "partial" } });
  });

  it("flips status to recovered when the partial recovery exactly completes the claim", () => {
    const result = computeRecoveryUpdate(
      { quantityClaimed: 20, quantityRecovered: 15, status: "partial" },
      { type: "partial_recovery", quantity: 5 },
    );
    expect(result).toEqual({ ok: true, update: { quantityRecovered: 20, status: "recovered" } });
  });

  it("rejects over-recovery beyond the claimed quantity", () => {
    const result = computeRecoveryUpdate(openCase, { type: "partial_recovery", quantity: 25 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/supererebbe/);
  });

  it("rejects a zero quantity", () => {
    const result = computeRecoveryUpdate(openCase, { type: "partial_recovery", quantity: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects a negative quantity", () => {
    const result = computeRecoveryUpdate(openCase, { type: "partial_recovery", quantity: -3 });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-integer quantity", () => {
    const result = computeRecoveryUpdate(openCase, { type: "partial_recovery", quantity: 2.5 });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing quantity", () => {
    const result = computeRecoveryUpdate(openCase, { type: "partial_recovery" });
    expect(result.ok).toBe(false);
  });
});

describe("computeRecoveryUpdate — full_recovery", () => {
  it("marks the case recovered when the full remaining quantity is logged", () => {
    const result = computeRecoveryUpdate(openCase, { type: "full_recovery", quantity: 20 });
    expect(result).toEqual({ ok: true, update: { quantityRecovered: 20, status: "recovered" } });
  });

  it("rejects a full_recovery event that does not cover the full remaining quantity", () => {
    const result = computeRecoveryUpdate(
      { quantityClaimed: 20, quantityRecovered: 8, status: "partial" },
      { type: "full_recovery", quantity: 5 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tutto il residuo/);
  });

  it("still rejects over-recovery for a full_recovery event too", () => {
    const result = computeRecoveryUpdate(openCase, { type: "full_recovery", quantity: 21 });
    expect(result.ok).toBe(false);
  });
});

describe("computeRecoveryUpdate — terminal states", () => {
  it("rejects recovery events after a case is recovered", () => {
    const result = computeRecoveryUpdate(
      { quantityClaimed: 20, quantityRecovered: 20, status: "recovered" },
      { type: "partial_recovery", quantity: 1 },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects state-changing events after a case is closed unrecovered", () => {
    const result = computeRecoveryUpdate(
      { quantityClaimed: 20, quantityRecovered: 3, status: "closed_unrecovered" },
      { type: "dispute" },
    );
    expect(result.ok).toBe(false);
  });

  it("allows notes on terminal cases without changing quantity or status", () => {
    const state = { quantityClaimed: 20, quantityRecovered: 20, status: "recovered" };
    expect(computeRecoveryUpdate(state, { type: "note" })).toEqual({
      ok: true,
      update: { quantityRecovered: 20, status: "recovered" },
    });
  });
});

describe("computeRecoveryUpdate — status-only events", () => {
  it("moves an open case to contacted on contact_attempt", () => {
    const result = computeRecoveryUpdate(openCase, { type: "contact_attempt" });
    expect(result).toEqual({ ok: true, update: { quantityRecovered: 0, status: "contacted" } });
  });

  it("does not downgrade a further-along status on contact_attempt", () => {
    const result = computeRecoveryUpdate({ ...openCase, status: "partial" }, { type: "contact_attempt" });
    expect(result).toEqual({ ok: true, update: { quantityRecovered: 0, status: "partial" } });
  });

  it("moves to scheduled/disputed/closed_unrecovered without touching quantity", () => {
    expect(computeRecoveryUpdate(openCase, { type: "scheduled" })).toEqual({
      ok: true,
      update: { quantityRecovered: 0, status: "scheduled" },
    });
    expect(computeRecoveryUpdate(openCase, { type: "dispute" })).toEqual({
      ok: true,
      update: { quantityRecovered: 0, status: "disputed" },
    });
    expect(computeRecoveryUpdate(openCase, { type: "closed" })).toEqual({
      ok: true,
      update: { quantityRecovered: 0, status: "closed_unrecovered" },
    });
  });

  it("leaves status untouched for response/pickup/note", () => {
    for (const type of ["response", "pickup", "note"] as const) {
      const result = computeRecoveryUpdate({ ...openCase, status: "scheduled" }, { type });
      expect(result).toEqual({ ok: true, update: { quantityRecovered: 0, status: "scheduled" } });
    }
  });
});
