"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";

export type VoucherCancelFormLabels = {
  confirmMessage: string;
  cancelButton: string;
  cancelling: string;
};

export function VoucherCancelForm({
  action,
  disabled,
  labels,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  disabled?: boolean;
  labels: VoucherCancelFormLabels;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(labels.confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}
      <button type="submit" className="btn btn-danger" disabled={disabled || pending}>
        {pending ? labels.cancelling : labels.cancelButton}
      </button>
    </form>
  );
}
