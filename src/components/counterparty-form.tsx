"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import { COUNTERPARTY_TYPES } from "@/lib/validation/master-data";
import type { Counterparty } from "@/lib/data/counterparties";
import { CountrySelect } from "@/components/country-select";

export type CounterpartyFormLabels = {
  legalName: string;
  tradingName: string;
  code: string;
  vatNumber: string;
  taxId: string;
  registrationNumber: string;
  type: string;
  typeLabels: Record<(typeof COUNTERPARTY_TYPES)[number], string>;
  addressLine: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  region: string;
  email: string;
  phone: string;
  countryCode: string;
  saving: string;
  createSubmit: string;
  saveSubmit: string;
};

export function CounterpartyForm({
  action,
  counterparty,
  labels,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  counterparty?: Counterparty;
  labels: CounterpartyFormLabels;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="legalName">{labels.legalName}</label>
          <input id="legalName" name="legalName" type="text" defaultValue={counterparty?.legal_name} required />
        </div>
        <div className="field">
          <label htmlFor="tradingName">{labels.tradingName}</label>
          <input id="tradingName" name="tradingName" type="text" defaultValue={counterparty?.trading_name ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="code">{labels.code}</label>
          <input id="code" name="code" type="text" defaultValue={counterparty?.code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="vatNumber">{labels.vatNumber}</label>
          <input id="vatNumber" name="vatNumber" type="text" defaultValue={counterparty?.vat_number ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="taxId">{labels.taxId}</label>
          <input id="taxId" name="taxId" type="text" defaultValue={counterparty?.tax_id ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="registrationNumber">{labels.registrationNumber}</label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            type="text"
            defaultValue={counterparty?.registration_number ?? ""}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="counterpartyType">{labels.type}</label>
        <select
          id="counterpartyType"
          name="counterpartyType"
          defaultValue={counterparty?.counterparty_type ?? "other"}
        >
          {COUNTERPARTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {labels.typeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="addressLine">{labels.addressLine}</label>
          <input id="addressLine" name="addressLine" type="text" defaultValue={counterparty?.address_line ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="addressLine2">{labels.addressLine2}</label>
          <input id="addressLine2" name="addressLine2" type="text" defaultValue={counterparty?.address_line_2 ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="postalCode">{labels.postalCode}</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={counterparty?.postal_code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="city">{labels.city}</label>
          <input id="city" name="city" type="text" defaultValue={counterparty?.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="province">{labels.region}</label>
          <input id="province" name="province" type="text" defaultValue={counterparty?.province ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="email">{labels.email}</label>
          <input id="email" name="email" type="email" defaultValue={counterparty?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">{labels.phone}</label>
          <input id="phone" name="phone" type="text" defaultValue={counterparty?.phone ?? ""} />
        </div>
      </div>

      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="countryCode">{labels.countryCode}</label>
        <CountrySelect id="countryCode" name="countryCode" defaultValue={counterparty?.country_code} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.saving : counterparty ? labels.saveSubmit : labels.createSubmit}
      </button>
    </form>
  );
}
