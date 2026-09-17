"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/lib/actions/onboarding";
import { emptyFormState } from "@/lib/actions/form-state";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="organizationName">Nome azienda</label>
        <input id="organizationName" name="organizationName" type="text" autoComplete="organization" required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creazione in corso…" : "Crea organizzazione"}
      </button>
    </form>
  );
}
