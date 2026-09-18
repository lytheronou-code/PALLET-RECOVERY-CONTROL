"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/actions/form-state";
import type { Site } from "@/lib/data/sites";
import type { Counterparty } from "@/lib/data/counterparties";

export function SiteForm({
  action,
  site,
  counterparties,
  defaultCounterpartyId,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  site?: Site;
  counterparties: Counterparty[];
  defaultCounterpartyId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="name">Nome sito</label>
          <input id="name" name="name" type="text" defaultValue={site?.name} required />
        </div>
        <div className="field">
          <label htmlFor="code">Codice</label>
          <input id="code" name="code" type="text" defaultValue={site?.code ?? ""} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="counterpartyId">Controparte collegata</label>
        <select
          id="counterpartyId"
          name="counterpartyId"
          defaultValue={site?.counterparty_id ?? defaultCounterpartyId ?? ""}
        >
          <option value="">Nessuna (sito/deposito interno)</option>
          {counterparties.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="addressLine">Indirizzo</label>
        <input id="addressLine" name="addressLine" type="text" defaultValue={site?.address_line ?? ""} />
      </div>

      <div className="form-grid-3">
        <div className="field">
          <label htmlFor="postalCode">CAP</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={site?.postal_code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="city">Città</label>
          <input id="city" name="city" type="text" defaultValue={site?.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="province">Provincia</label>
          <input id="province" name="province" type="text" defaultValue={site?.province ?? ""} />
        </div>
      </div>

      <div className="field" style={{ maxWidth: 120 }}>
        <label htmlFor="countryCode">Paese</label>
        <input
          id="countryCode"
          name="countryCode"
          type="text"
          maxLength={2}
          defaultValue={site?.country_code ?? "IT"}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Salvataggio…" : site ? "Salva modifiche" : "Crea sito"}
      </button>
    </form>
  );
}
