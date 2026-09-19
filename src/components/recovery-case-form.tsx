"use client";

import { useActionState, useEffect, useState } from "react";
import { createRecoveryCaseAction } from "@/lib/actions/recovery-cases";
import { listSitesForCounterpartyAction } from "@/lib/actions/sites";
import { emptyFormState } from "@/lib/actions/form-state";
import { PRIORITIES } from "@/lib/validation/recovery-case";

export type RecoveryCaseFormLabels = {
  counterparty: string;
  selectPlaceholder: string;
  palletType: string;
  site: string;
  noSite: string;
  noSitesForCounterparty: string;
  quantityClaimed: string;
  dueDate: string;
  priority: string;
  priorityOptions: Record<(typeof PRIORITIES)[number], string>;
  notes: string;
  creating: string;
  create: string;
};

// The site picker is contextual: it only ever offers sites belonging to
// the currently selected counterparty (fetched fresh on every change, not
// filtered client-side out of a full org-wide list), and clears the
// selected site whenever it stops matching. This is a UX convenience --
// the database enforces the same match independently via
// validate_voucher_recovery_site_match, so a stale/forged site_id can
// never slip through even if a client sends one anyway.
export function RecoveryCaseForm({
  counterparties,
  palletTypes,
  defaults,
  labels,
}: {
  counterparties: { id: string; legalName: string }[];
  palletTypes: { id: string; code: string }[];
  defaults?: {
    counterpartyId?: string;
    palletTypeId?: string;
    voucherId?: string;
    quantityClaimed?: number;
  };
  labels: RecoveryCaseFormLabels;
}) {
  const [state, formAction, pending] = useActionState(createRecoveryCaseAction, emptyFormState);
  const [counterpartyId, setCounterpartyId] = useState(defaults?.counterpartyId ?? "");
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

      {defaults?.voucherId ? <input type="hidden" name="voucherId" value={defaults.voucherId} /> : null}

      <div className="field">
        <label htmlFor="counterpartyId">{labels.counterparty}</label>
        <select
          id="counterpartyId"
          name="counterpartyId"
          value={counterpartyId}
          onChange={(e) => handleCounterpartyChange(e.target.value)}
          required
        >
          <option value="" disabled>
            {labels.selectPlaceholder}
          </option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.legalName}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="palletTypeId">{labels.palletType}</label>
        <select id="palletTypeId" name="palletTypeId" defaultValue={defaults?.palletTypeId ?? ""} required>
          <option value="" disabled>
            {labels.selectPlaceholder}
          </option>
          {palletTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
      </div>

      {counterpartyId ? (
        <div className="field">
          <label htmlFor="siteId">{labels.site}</label>
          <select id="siteId" name="siteId" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">{labels.noSite}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {sites.length === 0 ? (
            <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
              {labels.noSitesForCounterparty}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="quantityClaimed">{labels.quantityClaimed}</label>
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
          <label htmlFor="dueDate">{labels.dueDate}</label>
          <input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="priority">{labels.priority}</label>
        <select id="priority" name="priority" defaultValue="normal">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {labels.priorityOptions[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="notes">{labels.notes}</label>
        <textarea id="notes" name="notes" rows={3} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.creating : labels.create}
      </button>
    </form>
  );
}
