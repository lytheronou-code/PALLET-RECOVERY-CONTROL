"use client";

import { useActionState, useState } from "react";
import { addRecoveryEventAction } from "@/lib/actions/recovery-cases";
import { emptyFormState } from "@/lib/actions/form-state";
import { RECOVERY_EVENT_TYPES } from "@/lib/validation/recovery-case";
import { computeRecoveryUpdate, remainingQuantity, type RecoveryEventType } from "@/lib/recovery/quantity";
import { EVENT_LABELS } from "@/lib/recovery/labels";

const QUANTITY_EVENTS = new Set(["partial_recovery", "full_recovery"]);

export function RecoveryEventForm({
  caseId,
  quantityClaimed,
  quantityRecovered,
  status,
}: {
  caseId: string;
  quantityClaimed: number;
  quantityRecovered: number;
  status: string;
}) {
  const action = addRecoveryEventAction.bind(null, caseId);
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const [eventType, setEventType] = useState<RecoveryEventType>("contact_attempt");
  const [quantity, setQuantity] = useState<number | "">("");

  const remaining = remainingQuantity({ quantityClaimed, quantityRecovered, status });
  const preview =
    QUANTITY_EVENTS.has(eventType) && typeof quantity === "number"
      ? computeRecoveryUpdate({ quantityClaimed, quantityRecovered, status }, { type: eventType, quantity })
      : null;

  const isClosedCase = status === "recovered" || status === "closed_unrecovered" || status === "cancelled";

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}
      {isClosedCase ? (
        <p className="muted" style={{ fontSize: 13 }}>
          Questa pratica è chiusa; puoi comunque aggiungere una nota.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="eventType">Evento</label>
        <select
          id="eventType"
          name="eventType"
          value={eventType}
          onChange={(e) => setEventType(e.target.value as RecoveryEventType)}
        >
          {RECOVERY_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {QUANTITY_EVENTS.has(eventType) ? (
        <div className="field">
          <label htmlFor="quantity">Quantità (residuo: {remaining})</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            max={remaining}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            required
          />
          {preview && !preview.ok ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{preview.error}</p> : null}
          {preview && preview.ok ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Nuovo totale recuperato: {preview.update.quantityRecovered}/{quantityClaimed} → stato:{" "}
              {preview.update.status}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="notes">Note</label>
        <textarea id="notes" name="notes" rows={2} />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || (preview !== null && !preview.ok)}
        style={{ width: "auto" }}
      >
        {pending ? "Salvataggio…" : "Aggiungi evento"}
      </button>
    </form>
  );
}
