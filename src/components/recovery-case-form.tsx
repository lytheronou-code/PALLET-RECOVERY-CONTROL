"use client";

import { useActionState } from "react";
import { createRecoveryCaseAction } from "@/lib/actions/recovery-cases";
import { emptyFormState } from "@/lib/actions/form-state";
import { PRIORITIES } from "@/lib/validation/recovery-case";

const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: "Bassa",
  normal: "Normale",
  high: "Alta",
  critical: "Critica",
};

export function RecoveryCaseForm({
  counterparties,
  palletTypes,
  sites,
  defaults,
}: {
  counterparties: { id: string; legalName: string }[];
  palletTypes: { id: string; code: string }[];
  sites: { id: string; name: string }[];
  defaults?: {
    counterpartyId?: string;
    palletTypeId?: string;
    voucherId?: string;
    quantityClaimed?: number;
  };
}) {
  const [state, formAction, pending] = useActionState(createRecoveryCaseAction, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      {defaults?.voucherId ? <input type="hidden" name="voucherId" value={defaults.voucherId} /> : null}

      <div className="field">
        <label htmlFor="counterpartyId">Controparte</label>
        <select id="counterpartyId" name="counterpartyId" defaultValue={defaults?.counterpartyId ?? ""} required>
          <option value="" disabled>
            — seleziona —
          </option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.legalName}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="palletTypeId">Tipo pallet</label>
        <select id="palletTypeId" name="palletTypeId" defaultValue={defaults?.palletTypeId ?? ""} required>
          <option value="" disabled>
            — seleziona —
          </option>
          {palletTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
      </div>

      {sites.length > 0 ? (
        <div className="field">
          <label htmlFor="siteId">Sito</label>
          <select id="siteId" name="siteId" defaultValue="">
            <option value="">Nessuno</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="quantityClaimed">Quantità richiesta</label>
          <input
            id="quantityClaimed"
            name="quantityClaimed"
            type="number"
            min="1"
            step="1"
            defaultValue={defaults?.quantityClaimed}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="dueDate">Scadenza</label>
          <input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="priority">Priorità</label>
        <select id="priority" name="priority" defaultValue="normal">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="notes">Note</label>
        <textarea id="notes" name="notes" rows={3} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? "Creazione…" : "Crea pratica"}
      </button>
    </form>
  );
}
