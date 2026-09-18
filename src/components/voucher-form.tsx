"use client";

import { useActionState, useEffect, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import { listSitesForCounterpartyAction } from "@/lib/actions/sites";
import type { Counterparty } from "@/lib/data/counterparties";
import type { PalletType } from "@/lib/data/pallet-types";

// See RecoveryCaseForm for the same contextual-site-picker rationale:
// sites are fetched fresh for the selected counterparty rather than
// filtered client-side out of a full org-wide list, and the DB enforces
// the same match independently.
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
  const [counterpartyId, setCounterpartyId] = useState("");
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    if (!counterpartyId) return;
    let cancelled = false;
    listSitesForCounterpartyAction(counterpartyId).then((result) => {
      if (cancelled) return;
      setSites(result);
      setSiteId((current) => (result.some((site) => site.id === current) ? current : ""));
    });
    return () => {
      cancelled = true;
    };
  }, [counterpartyId]);

  function handleCounterpartyChange(value: string) {
    setCounterpartyId(value);
    if (!value) {
      setSites([]);
      setSiteId("");
    }
  }

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="counterpartyId">Controparte</label>
          <select
            id="counterpartyId"
            name="counterpartyId"
            required
            value={counterpartyId}
            onChange={(e) => handleCounterpartyChange(e.target.value)}
          >
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

      {counterpartyId ? (
        <div className="field">
          <label htmlFor="siteId">Sito</label>
          <select id="siteId" name="siteId" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Nessuno</option>
            {sites.map((s) => (
              <option value={s.id} key={s.id}>{s.name}</option>
            ))}
          </select>
          {sites.length === 0 ? (
            <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
              Nessun sito registrato per questa controparte.
            </p>
          ) : null}
        </div>
      ) : null}

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
