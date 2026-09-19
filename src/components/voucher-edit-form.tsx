"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { VoucherDetail } from "@/lib/data/vouchers";

export type VoucherEditFormLabels = {
  lockedNotice: string;
  voucherNumber: string;
  issueDate: string;
  dueDate: string;
  quantity: string;
  notes: string;
  save: string;
  saving: string;
};

export function VoucherEditForm({
  action,
  voucher,
  labels,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  voucher: VoucherDetail;
  labels: VoucherEditFormLabels;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="card" style={{ marginBottom: 14, background: "var(--surface-soft)" }}>
        <div className="row-title">{voucher.counterpartyName}</div>
        <div className="row-subtitle">
          {labels.lockedNotice}
        </div>
      </div>

      <div className="field">
        <label htmlFor="voucherNumber">{labels.voucherNumber}</label>
        <input id="voucherNumber" name="voucherNumber" defaultValue={voucher.voucherNumber} required />
      </div>

      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="issueDate">{labels.issueDate}</label>
          <input id="issueDate" name="issueDate" type="date" defaultValue={voucher.issueDate} required />
        </div>
        <div className="field">
          <label htmlFor="recoveryDueDate">{labels.dueDate}</label>
          <input id="recoveryDueDate" name="recoveryDueDate" type="date" defaultValue={voucher.recoveryDueDate ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="quantity">{labels.quantity}</label>
          <input id="quantity" name="quantity" type="number" min={Math.max(1, voucher.recoveredQuantity)} step="1" defaultValue={voucher.quantity} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">{labels.notes}</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={voucher.notes ?? ""} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
