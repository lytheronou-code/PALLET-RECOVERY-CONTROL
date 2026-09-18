"use client";

import { useActionState, useState } from "react";
import { correctMovementAction } from "@/lib/actions/movements";
import { emptyFormState } from "@/lib/actions/form-state";
import type { MovementListItem } from "@/lib/data/movements";

export function CorrectMovementForm({ movement }: { movement: MovementListItem }) {
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
        <label htmlFor="reason">Motivo della correzione</label>
        <textarea id="reason" name="reason" rows={2} required placeholder="Es. quantità errata da import, controparte sbagliata…" />
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          name="reversalOnly"
          checked={reversalOnly}
          onChange={(e) => setReversalOnly(e.target.checked)}
        />
        Il movimento originale è completamente errato (solo storno, nessuna sostituzione)
      </label>

      {!reversalOnly ? (
        <>
          <p className="muted" style={{ fontSize: 11, margin: "10px 0" }}>
            Valori del movimento corretto che sostituirà quello originale:
          </p>
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="movementDate">Data</label>
              <input id="movementDate" name="movementDate" type="date" defaultValue={movement.movementDate} />
            </div>
            <div className="field">
              <label htmlFor="direction">Direzione</label>
              <select id="direction" name="direction" defaultValue={movement.direction}>
                <option value="outbound">OUT (uscita)</option>
                <option value="inbound">IN (rientro)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="quantity">Quantità</label>
              <input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue={movement.quantity} />
            </div>
            <div className="field">
              <label htmlFor="documentType">Tipo documento</label>
              <input id="documentType" name="documentType" type="text" defaultValue={movement.documentType ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="documentNumber">Numero documento</label>
              <input id="documentNumber" name="documentNumber" type="text" defaultValue={movement.documentNumber ?? ""} />
            </div>
          </div>
        </>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : reversalOnly ? "Storna movimento" : "Correggi movimento"}
      </button>
    </form>
  );
}
