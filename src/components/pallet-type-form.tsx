"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { PalletType } from "@/lib/data/pallet-types";

export function PalletTypeForm({
  action,
  palletType,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  palletType?: PalletType;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="field">
        <label htmlFor="code">Codice</label>
        <input id="code" name="code" type="text" defaultValue={palletType?.code} placeholder="EPAL EUR1" required />
      </div>

      <div className="field">
        <label htmlFor="description">Descrizione</label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={palletType?.description}
          placeholder="Europallet EUR1 800x1200"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="unitValue">Valore unitario (€)</label>
        <input
          id="unitValue"
          name="unitValue"
          type="number"
          step="0.01"
          min="0"
          defaultValue={palletType?.unit_value}
          required
        />
      </div>

      {palletType ? (
        <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 14 }}>
          Le pratiche di recupero già aperte mantengono il valore unitario storico (snapshot): questa modifica vale
          solo per le nuove pratiche.
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? "Salvataggio…" : palletType ? "Salva modifiche" : "Crea tipo pallet"}
      </button>
    </form>
  );
}
