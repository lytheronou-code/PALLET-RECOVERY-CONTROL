"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { PalletType } from "@/lib/data/pallet-types";

export type PalletTypeFormLabels = {
  code: string;
  description: string;
  unitValue: string;
  unitValueEditNote: string;
  saving: string;
  createSubmit: string;
  saveSubmit: string;
};

export function PalletTypeForm({
  action,
  palletType,
  labels,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  palletType?: PalletType;
  labels: PalletTypeFormLabels;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="field">
        <label htmlFor="code">{labels.code}</label>
        <input id="code" name="code" type="text" defaultValue={palletType?.code} placeholder="EPAL EUR1" required />
      </div>

      <div className="field">
        <label htmlFor="description">{labels.description}</label>
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
        <label htmlFor="unitValue">{labels.unitValue}</label>
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
          {labels.unitValueEditNote}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.saving : palletType ? labels.saveSubmit : labels.createSubmit}
      </button>
    </form>
  );
}
