"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { VoucherDetail } from "@/lib/data/vouchers";

export function VoucherEditForm({
  action,
  voucher,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  voucher: VoucherDetail;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="card" style={{ marginBottom: 14, background: "var(--surface-soft)" }}>
        <div className="row-title">{voucher.counterpartyName}</div>
        <div className="row-subtitle">
          {voucher.palletTypeCode} · controparte e tipo pallet restano bloccati per preservare la coerenza delle pratiche collegate.
        </div>
      </div>

      <div className="field">
        <label htmlFor="voucherNumber">Numero buono / riferimento</label>
        <input id="voucherNumber" name="voucherNumber" defaultValue={voucher.voucherNumber} required />
      </div>

      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="issueDate">Data emissione</label>
          <input id="issueDate" name="issueDate" type="date" defaultValue={voucher.issueDate} required />
        </div>
        <div className="field">
          <label htmlFor="recoveryDueDate">Scadenza recupero</label>
          <input id="recoveryDueDate" name="recoveryDueDate" type="date" defaultValue={voucher.recoveryDueDate ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="quantity">Quantità</label>
          <input id="quantity" name="quantity" type="number" min={Math.max(1, voucher.recoveredQuantity)} step="1" defaultValue={voucher.quantity} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Note</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={voucher.notes ?? ""} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </form>
  );
}
