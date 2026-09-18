"use client";

import { useActionState } from "react";
import {
  grantClientPortalAccessAction,
  setClientPortalMembershipActiveAction,
} from "@/lib/actions/client-portal-admin";
import { emptyFormState } from "@/lib/actions/form-state";
import { formatDate } from "@/lib/format";
import type { ClientPortalMembershipRow } from "@/lib/data/client-portal-admin";

export function ClientPortalAccessPanel({
  counterpartyId,
  members,
}: {
  counterpartyId: string;
  members: ClientPortalMembershipRow[];
}) {
  const [state, formAction, pending] = useActionState(
    grantClientPortalAccessAction.bind(null, counterpartyId),
    emptyFormState,
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Portale clienti</h2>
          <div className="panel-subtitle">Utenti autorizzati a vedere i dati di questa controparte in sola lettura.</div>
        </div>
      </div>
      <div className="panel-body">
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
          Il cliente deve avere già un account (registrato su /signup) con questa email.
        </p>

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
                  <th></th>
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
                    <td>
                      <form
                        action={setClientPortalMembershipActiveAction.bind(null, member.id, !member.active, counterpartyId)}
                      >
                        <button type="submit" className="btn btn-ghost btn-sm">
                          {member.active ? "Disattiva" : "Riattiva"}
                        </button>
                      </form>
                    </td>
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
