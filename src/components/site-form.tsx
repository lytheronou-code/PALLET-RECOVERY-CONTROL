"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { Site } from "@/lib/data/sites";
import type { Counterparty } from "@/lib/data/counterparties";
import { CountrySelect } from "@/components/country-select";

export type SiteFormLabels = {
  name: string;
  code: string;
  linkedCounterparty: string;
  noCounterpartyOption: string;
  addressLine: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  region: string;
  countryCode: string;
  saving: string;
  createSubmit: string;
  saveSubmit: string;
};

export function SiteForm({
  action,
  site,
  counterparties,
  defaultCounterpartyId,
  labels,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  site?: Site;
  counterparties: Counterparty[];
  defaultCounterpartyId?: string;
  labels: SiteFormLabels;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="name">{labels.name}</label>
          <input id="name" name="name" type="text" defaultValue={site?.name} required />
        </div>
        <div className="field">
          <label htmlFor="code">{labels.code}</label>
          <input id="code" name="code" type="text" defaultValue={site?.code ?? ""} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="counterpartyId">{labels.linkedCounterparty}</label>
        <select
          id="counterpartyId"
          name="counterpartyId"
          defaultValue={site?.counterparty_id ?? defaultCounterpartyId ?? ""}
        >
          <option value="">{labels.noCounterpartyOption}</option>
          {counterparties.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="addressLine">{labels.addressLine}</label>
          <input id="addressLine" name="addressLine" type="text" defaultValue={site?.address_line ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="addressLine2">{labels.addressLine2}</label>
          <input id="addressLine2" name="addressLine2" type="text" defaultValue={site?.address_line_2 ?? ""} />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="postalCode">{labels.postalCode}</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={site?.postal_code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="city">{labels.city}</label>
          <input id="city" name="city" type="text" defaultValue={site?.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="province">{labels.region}</label>
          <input id="province" name="province" type="text" defaultValue={site?.province ?? ""} />
        </div>
      </div>

      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="countryCode">{labels.countryCode}</label>
        <CountrySelect id="countryCode" name="countryCode" defaultValue={site?.country_code} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? labels.saving : site ? labels.saveSubmit : labels.createSubmit}
      </button>
    </form>
  );
}
