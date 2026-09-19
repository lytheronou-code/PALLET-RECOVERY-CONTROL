"use client";

import { useActionState, useState } from "react";
import { correctMovementAction } from "@/lib/actions/movements";
import { emptyFormState } from "@/lib/actions/form-state";
import type { MovementListItem } from "@/lib/data/movements";

export type CorrectMovementFormLabels = {
  reason: string;
  reasonPlaceholder: string;
  reversalOnly: string;
  replacementIntro: string;
  date: string;
  direction: string;
  outbound: string;
  inbound: string;
  quantity: string;
  documentType: string;
  documentNumber: string;
  saving: string;
  reverseButton: string;
  correctButton: string;
};

export function CorrectMovementForm({
  movement,
  labels,
}: {
  movement: MovementListItem;
  labels: CorrectMovementFormLabels;
}) {
  const action = correctMovementAction.bind(null, movement.id);
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const [reversalOnly, setReversalOnly] = useState(false);

  if (state.message) {
    return <div className="form-message">{state.message}</div>;
  }

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="field">
        <label htmlFor="reason">{labels.reason}</label>
        <textarea id="reason" name="reason" rows={2} required placeholder={labels.reasonPlaceholder} />
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          name="reversalOnly"
          checked={reversalOnly}
          onChange={(e) => setReversalOnly(e.target.checked)}
        />
        {labels.reversalOnly}
      </label>

      {!reversalOnly ? (
        <>
          <p className="muted" style={{ fontSize: 11, margin: "10px 0" }}>
            {labels.replacementIntro}
          </p>
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="movementDate">{labels.date}</label>
              <input id="movementDate" name="movementDate" type="date" defaultValue={movement.movementDate} />
            </div>
            <div className="field">
              <label htmlFor="direction">{labels.direction}</label>
              <select id="direction" name="direction" defaultValue={movement.direction}>
                <option value="outbound">{labels.outbound}</option>
                <option value="inbound">{labels.inbound}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="quantity">{labels.quantity}</label>
              <input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue={movement.quantity} />
            </div>
            <div className="field">
              <label htmlFor="documentType">{labels.documentType}</label>
              <input id="documentType" name="documentType" type="text" defaultValue={movement.documentType ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="documentNumber">{labels.documentNumber}</label>
              <input id="documentNumber" name="documentNumber" type="text" defaultValue={movement.documentNumber ?? ""} />
            </div>
          </div>
        </>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? labels.saving : reversalOnly ? labels.reverseButton : labels.correctButton}
      </button>
    </form>
  );
}
