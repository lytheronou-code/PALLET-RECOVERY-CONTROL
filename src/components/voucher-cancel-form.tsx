"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";

export function VoucherCancelForm({
  action,
  disabled,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Annullare questo buono? L'operazione è consentita solo se non esistono recuperi o pratiche collegate.")) {
          event.preventDefault();
        }
      }}
    >
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}
      <button type="submit" className="btn btn-danger" disabled={disabled || pending}>
        {pending ? "Annullamento…" : "Annulla buono"}
      </button>
    </form>
  );
}
