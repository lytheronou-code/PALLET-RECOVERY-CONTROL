"use client";

import { useActionState } from "react";
import { createFirstCustomerAction } from "@/lib/actions/onboarding-setup";
import { emptyFormState } from "@/lib/actions/form-state";
import { CountrySelect } from "@/components/country-select";

export function OnboardingFirstCustomerForm({
  labels,
}: {
  labels: { customerName: string; save: string; saving: string };
}) {
  const [state, formAction, pending] = useActionState(createFirstCustomerAction, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="legalName">{labels.customerName}</label>
          <input id="legalName" name="legalName" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="countryCode">Paese</label>
          <CountrySelect id="countryCode" name="countryCode" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
