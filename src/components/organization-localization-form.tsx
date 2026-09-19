"use client";

import { useActionState } from "react";
import { updateOrganizationLocalizationAction } from "@/lib/actions/organization-settings";
import { emptyFormState } from "@/lib/actions/form-state";
import { CurrencySelect } from "@/components/currency-select";
import { TimezoneSelect } from "@/components/timezone-select";
import type { Tables } from "@/lib/supabase/database.types";

export type OrganizationLocalizationLabels = {
  defaultLanguage: string;
  defaultCurrency: string;
  timezone: string;
  save: string;
  saving: string;
  languageEn: string;
  languageIt: string;
};

export function OrganizationLocalizationForm({
  organization,
  timezones,
  labels,
}: {
  organization: Tables<"organizations">;
  timezones: string[];
  labels: OrganizationLocalizationLabels;
}) {
  const [state, formAction, pending] = useActionState(updateOrganizationLocalizationAction, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="defaultLocale">{labels.defaultLanguage}</label>
          <select id="defaultLocale" name="defaultLocale" defaultValue={organization.default_locale}>
            <option value="en">{labels.languageEn}</option>
            <option value="it">{labels.languageIt}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="defaultCurrency">{labels.defaultCurrency}</label>
          <CurrencySelect id="defaultCurrency" name="defaultCurrency" defaultValue={organization.default_currency} />
        </div>
        <div className="field">
          <label htmlFor="timezone">{labels.timezone}</label>
          <TimezoneSelect id="timezone" name="timezone" defaultValue={organization.timezone} timezones={timezones} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-sm" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
