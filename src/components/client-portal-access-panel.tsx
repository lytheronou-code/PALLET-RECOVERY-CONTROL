"use client";

import { useActionState, useState } from "react";
import {
  grantClientPortalAccessAction,
  setClientPortalMembershipActiveAction,
} from "@/lib/actions/client-portal-admin";
import { emptyFormState } from "@/lib/actions/form-state";
import { createFormatters } from "@/lib/format";
import type { ClientPortalMembershipRow } from "@/lib/data/client-portal-admin";
import type { Locale } from "@/i18n/locale";

export function ClientPortalAccessPanel({
  counterpartyId,
  members,
  isAdmin,
  locale,
  currency,
  timeZone,
}: {
  counterpartyId: string;
  members: ClientPortalMembershipRow[];
  isAdmin: boolean;
  locale: Locale;
  currency: string;
  timeZone: string;
}) {
  const { formatDate } = createFormatters(locale, currency, timeZone);
  const [state, formAction, pending] = useActionState(
    grantClientPortalAccessAction.bind(null, counterpartyId),
    emptyFormState,
  );
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleToggle(membershipId: string, active: boolean) {
    setRowError(null);
    const result = await setClientPortalMembershipActiveAction(membershipId, active, counterpartyId);
    if (result.error) setRowError(result.error);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Portale clienti</h2>
          <div className="panel-subtitle">Utenti autorizzati a vedere i dati di questa controparte in sola lettura.</div>
        </div>
      </div>
      <div className="panel-body">
        {isAdmin ? (
          <>
            <form action={formAction} className="form-grid-2" style={{ alignItems: "end" }}>
              {state.error ? <div className="form-error" style={{ gridColumn: "1 / -1" }}>{state.error}</div> : null}
              {state.message ? <div className="form-message" style={{ gridColumn: "1 / -1" }}>{state.message}</div> : null}
              <div className="field">
                <label htmlFor={`portal-email-${counterpartyId}`}>Email cliente</label>
                <input
                  id={`portal-email-${counterpartyId}`}
                  name="email"
                  type="email"
                  placeholder="cliente@azienda.it"
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
                {pending ? "Concessione…" : "Concedi accesso"}
              </button>
            </form>
            <p className="muted" style={{ fontSize: 11, marginTop: 8, marginBottom: 16 }}>
              Il cliente deve avere già un account (registrato su /signup) con questa email. Un account può avere
              accesso attivo a una sola controparte alla volta.
            </p>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
            Solo un amministratore può concedere o revocare l&apos;accesso al portale clienti. Di seguito lo stato
            attuale in sola lettura.
          </p>
        )}

        {rowError ? <div className="form-error" style={{ marginBottom: 12 }}>{rowError}</div> : null}

        {members.length === 0 ? (
          <div className="empty-state">Nessun utente portale per questa controparte.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Concesso il</th>
                  <th>Stato</th>
                  {isAdmin ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.email}</td>
                    <td>{member.displayName ?? "—"}</td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>
                      <span className={"badge " + (member.active ? "badge-closed" : "badge-neutral")}>
                        {member.active ? "Attivo" : "Disattivato"}
                      </span>
                    </td>
                    {isAdmin ? (
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggle(member.id, !member.active)}
                        >
                          {member.active ? "Disattiva" : "Riattiva"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
