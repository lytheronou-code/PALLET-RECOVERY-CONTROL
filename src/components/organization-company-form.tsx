"use client";

import { useActionState } from "react";
import { updateOrganizationCompanyAction } from "@/lib/actions/organization-settings";
import { emptyFormState } from "@/lib/actions/form-state";
import { CountrySelect } from "@/components/country-select";
import type { Tables } from "@/lib/supabase/database.types";
import type { Locale } from "@/i18n/locale";

export type OrganizationCompanyLabels = {
  legalName: string;
  tradingName: string;
  countryCode: string;
  taxId: string;
  vatId: string;
  registrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  website: string;
  supportEmail: string;
  supportPhone: string;
  save: string;
  saving: string;
};

export function OrganizationCompanyForm({
  organization,
  labels,
  locale,
}: {
  organization: Tables<"organizations">;
  labels: OrganizationCompanyLabels;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(updateOrganizationCompanyAction, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      {state.message ? <div className="form-message">{state.message}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="legalName">{labels.legalName}</label>
          <input id="legalName" name="legalName" type="text" defaultValue={organization.legal_name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="tradingName">{labels.tradingName}</label>
          <input id="tradingName" name="tradingName" type="text" defaultValue={organization.trading_name ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="taxId">{labels.taxId}</label>
          <input id="taxId" name="taxId" type="text" defaultValue={organization.tax_id ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="vatId">{labels.vatId}</label>
          <input id="vatId" name="vatId" type="text" defaultValue={organization.vat_id ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="registrationNumber">{labels.registrationNumber}</label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            type="text"
            defaultValue={organization.registration_number ?? ""}
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="addressLine1">{labels.addressLine1}</label>
          <input id="addressLine1" name="addressLine1" type="text" defaultValue={organization.address_line_1 ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="addressLine2">{labels.addressLine2}</label>
          <input id="addressLine2" name="addressLine2" type="text" defaultValue={organization.address_line_2 ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="city">{labels.city}</label>
          <input id="city" name="city" type="text" defaultValue={organization.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="region">{labels.region}</label>
          <input id="region" name="region" type="text" defaultValue={organization.region ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="postalCode">{labels.postalCode}</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={organization.postal_code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="countryCode">{labels.countryCode}</label>
          <CountrySelect id="countryCode" name="countryCode" defaultValue={organization.country_code ?? undefined} locale={locale} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="website">{labels.website}</label>
          <input id="website" name="website" type="text" defaultValue={organization.website ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="supportEmail">{labels.supportEmail}</label>
          <input id="supportEmail" name="supportEmail" type="email" defaultValue={organization.support_email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="supportPhone">{labels.supportPhone}</label>
          <input id="supportPhone" name="supportPhone" type="text" defaultValue={organization.support_phone ?? ""} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-sm" disabled={pending} style={{ width: "auto" }}>
        {pending ? labels.saving : labels.save}
      </button>
    </form>
  );
}
