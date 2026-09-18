"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { Counterparty } from "@/lib/data/counterparties";
import type { PalletType } from "@/lib/data/pallet-types";

export function VoucherForm({
  action,
  counterparties,
  palletTypes,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  counterparties: Counterparty[];
  palletTypes: PalletType[];
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="counterpartyId">Controparte</label>
          <select id="counterpartyId" name="counterpartyId" required defaultValue="">
            <option value="" disabled>Seleziona…</option>
            {counterparties.map((item) => (
              <option value={item.id} key={item.id}>{item.legal_name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="palletTypeId">Tipo pallet</label>
          <select id="palletTypeId" name="palletTypeId" required defaultValue="">
            <option value="" disabled>Seleziona…</option>
            {palletTypes.map((item) => (
              <option value={item.id} key={item.id}>{item.code} — {item.description}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="voucherNumber">Numero buono / riferimento</label>
        <input id="voucherNumber" name="voucherNumber" required placeholder="es. BV-2026-001847" />
      </div>

      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="issueDate">Data emissione</label>
          <input id="issueDate" name="issueDate" type="date" defaultValue={today} required />
        </div>

        <div className="field">
          <label htmlFor="recoveryDueDate">Scadenza recupero</label>
          <input id="recoveryDueDate" name="recoveryDueDate" type="date" />
        </div>

        <div className="field">
          <label htmlFor="quantity">Quantità</label>
          <input id="quantity" name="quantity" type="number" min="1" step="1" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Note</label>
        <textarea id="notes" name="notes" rows={3} placeholder="Riferimenti DDT, condizioni, informazioni utili al recupero…" />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creazione…" : "Crea buono"}
      </button>
    </form>
  );
}
