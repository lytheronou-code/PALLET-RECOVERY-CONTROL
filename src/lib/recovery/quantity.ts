// Pure mirror of the record_recovery_event() Postgres function's quantity
// and status math (see supabase/migrations/20260917214500_record_recovery_event_rpc.sql).
// Used client-side for immediate form feedback (max recoverable quantity,
// disabling an over-claim submit) so the user isn't surprised by a server
// rejection. The RPC remains the sole source of truth and re-derives this
// itself inside a row lock — this copy must never be trusted for the actual
// write.

export type RecoveryEventType =
  | "contact_attempt"
  | "response"
  | "scheduled"
  | "pickup"
  | "partial_recovery"
  | "full_recovery"
  | "dispute"
  | "note"
  | "closed";

export type RecoveryCaseState = {
  quantityClaimed: number;
  quantityRecovered: number;
  status: string;
};

export type RecoveryUpdate = { quantityRecovered: number; status: string };
export type RecoveryUpdateResult = { ok: true; update: RecoveryUpdate } | { ok: false; error: string };

export function remainingQuantity(state: RecoveryCaseState): number {
  return Math.max(0, state.quantityClaimed - state.quantityRecovered);
}

export function computeRecoveryUpdate(
  state: RecoveryCaseState,
  event: { type: RecoveryEventType; quantity?: number },
): RecoveryUpdateResult {
  if (event.type === "partial_recovery" || event.type === "full_recovery") {
    if (!event.quantity || event.quantity <= 0 || !Number.isInteger(event.quantity)) {
      return { ok: false, error: "La quantità deve essere un intero positivo" };
    }
    const newRecovered = state.quantityRecovered + event.quantity;
    if (newRecovered > state.quantityClaimed) {
      return {
        ok: false,
        error: `Quantità recuperata (${newRecovered}) supererebbe quella richiesta (${state.quantityClaimed})`,
      };
    }
    return {
      ok: true,
      update: {
        quantityRecovered: newRecovered,
        status: newRecovered === state.quantityClaimed ? "recovered" : "partial",
      },
    };
  }

  if (event.type === "contact_attempt") {
    return {
      ok: true,
      update: {
        quantityRecovered: state.quantityRecovered,
        status: state.status === "open" ? "contacted" : state.status,
      },
    };
  }

  const statusByEvent: Partial<Record<RecoveryEventType, string>> = {
    scheduled: "scheduled",
    dispute: "disputed",
    closed: "closed_unrecovered",
  };

  return {
    ok: true,
    update: {
      quantityRecovered: state.quantityRecovered,
      status: statusByEvent[event.type] ?? state.status,
    },
  };
}
