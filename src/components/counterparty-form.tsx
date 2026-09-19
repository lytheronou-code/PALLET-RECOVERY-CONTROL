"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import { COUNTERPARTY_TYPES } from "@/lib/validation/master-data";
import type { Counterparty } from "@/lib/data/counterparties";
import { CountrySelect } from "@/components/country-select";

const TYPE_LABELS: Record<(typeof COUNTERPARTY_TYPES)[number], string> = {
  customer: "Cliente",
  debtor: "Debitore",
  retailer: "Punto vendita",
  carrier: "Trasportatore",
  supplier: "Fornitore",
  other: "Altro",
};

export function CounterpartyForm({
  action,
  counterparty,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  counterparty?: Counterparty;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="legalName">Ragione sociale</label>
          <input id="legalName" name="legalName" type="text" defaultValue={counterparty?.legal_name} required />
        </div>
        <div className="field">
          <label htmlFor="tradingName">Nome commerciale</label>
          <input id="tradingName" name="tradingName" type="text" defaultValue={counterparty?.trading_name ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="code">Codice</label>
          <input id="code" name="code" type="text" defaultValue={counterparty?.code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="vatNumber">P.IVA</label>
          <input id="vatNumber" name="vatNumber" type="text" defaultValue={counterparty?.vat_number ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="taxId">Codice fiscale</label>
          <input id="taxId" name="taxId" type="text" defaultValue={counterparty?.tax_id ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="registrationNumber">N. registrazione</label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            type="text"
            defaultValue={counterparty?.registration_number ?? ""}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="counterpartyType">Tipologia</label>
        <select
          id="counterpartyType"
          name="counterpartyType"
          defaultValue={counterparty?.counterparty_type ?? "other"}
        >
          {COUNTERPARTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="addressLine">Indirizzo</label>
          <input id="addressLine" name="addressLine" type="text" defaultValue={counterparty?.address_line ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="addressLine2">Indirizzo (riga 2)</label>
          <input id="addressLine2" name="addressLine2" type="text" defaultValue={counterparty?.address_line_2 ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="postalCode">CAP</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={counterparty?.postal_code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="city">Città</label>
          <input id="city" name="city" type="text" defaultValue={counterparty?.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="province">Provincia / regione</label>
          <input id="province" name="province" type="text" defaultValue={counterparty?.province ?? ""} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={counterparty?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefono</label>
          <input id="phone" name="phone" type="text" defaultValue={counterparty?.phone ?? ""} />
        </div>
      </div>

      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="countryCode">Paese</label>
        <CountrySelect id="countryCode" name="countryCode" defaultValue={counterparty?.country_code} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "auto" }}>
        {pending ? "Salvataggio…" : counterparty ? "Salva modifiche" : "Crea controparte"}
      </button>
    </form>
  );
}
