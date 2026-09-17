"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/lib/actions/onboarding";
import type { AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

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
