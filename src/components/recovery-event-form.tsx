"use client";

import { useActionState, useState } from "react";
import { addRecoveryEventAction } from "@/lib/actions/recovery-cases";
import { emptyFormState } from "@/lib/actions/form-state";
import { RECOVERY_EVENT_TYPES } from "@/lib/validation/recovery-case";
import { computeRecoveryUpdate, remainingQuantity, type RecoveryEventType } from "@/lib/recovery/quantity";

const QUANTITY_EVENTS = new Set<RecoveryEventType>(["partial_recovery", "full_recovery"]);
const TERMINAL_STATUSES = new Set(["recovered", "closed_unrecovered", "cancelled"]);

// Plain strings only -- a "use client" component cannot receive a function
// as a prop (same reason it cannot receive `t` directly), so the parent
// Server Component resolves these as `{placeholder}` templates via t() and
// this component does the final, purely local interpolation itself.
function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type RecoveryEventFormLabels = {
  closedCaseNotice: string;
  eventType: string;
  eventTypeOptions: Record<RecoveryEventType, string>;
  quantityRemainingTemplate: string;
  recoveredTotalPreviewTemplate: string;
  notes: string;
  saving: string;
  addEvent: string;
  statusLabels: Record<string, string>;
};

export function RecoveryEventForm({
  caseId,
  quantityClaimed,
  quantityRecovered,
  status,
  labels,
}: {
  caseId: string;
  quantityClaimed: number;
  quantityRecovered: number;
  status: string;
  labels: RecoveryEventFormLabels;
}) {
  const action = addRecoveryEventAction.bind(null, caseId);
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const isClosedCase = TERMINAL_STATUSES.has(status);
  const [eventType, setEventType] = useState<RecoveryEventType>(isClosedCase ? "note" : "contact_attempt");
  const [quantity, setQuantity] = useState<number | "">("");

  const remaining = remainingQuantity({ quantityClaimed, quantityRecovered, status });
  const availableEventTypes: readonly RecoveryEventType[] = isClosedCase ? ["note"] : RECOVERY_EVENT_TYPES;
  const preview =
    QUANTITY_EVENTS.has(eventType) && typeof quantity === "number"
      ? computeRecoveryUpdate({ quantityClaimed, quantityRecovered, status }, { type: eventType, quantity })
      : null;

  function handleEventTypeChange(next: RecoveryEventType) {
    setEventType(next);
    if (next === "full_recovery") {
      setQuantity(remaining);
    } else if (!QUANTITY_EVENTS.has(next)) {
      setQuantity("");
    }
  }

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}
      {isClosedCase ? (
        <p className="muted" style={{ fontSize: 13 }}>
          {labels.closedCaseNotice}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="eventType">{labels.eventType}</label>
        <select
          id="eventType"
          name="eventType"
          value={eventType}
          onChange={(e) => handleEventTypeChange(e.target.value as RecoveryEventType)}
        >
          {availableEventTypes.map((type) => (
            <option key={type} value={type}>
              {labels.eventTypeOptions[type]}
            </option>
          ))}
        </select>
      </div>

      {QUANTITY_EVENTS.has(eventType) ? (
        <div className="field">
          <label htmlFor="quantity">{fillTemplate(labels.quantityRemainingTemplate, { remaining })}</label>
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
              {fillTemplate(labels.recoveredTotalPreviewTemplate, {
                recovered: preview.update.quantityRecovered,
                claimed: quantityClaimed,
                status: labels.statusLabels[preview.update.status] ?? preview.update.status,
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="notes">{labels.notes}</label>
        <textarea id="notes" name="notes" rows={2} />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || (preview !== null && !preview.ok)}
        style={{ width: "auto" }}
      >
        {pending ? labels.saving : labels.addEvent}
      </button>
    </form>
  );
}
