import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { setCounterpartyActiveAction } from "@/lib/actions/counterparties";

const TYPE_LABELS: Record<string, string> = {
  customer: "Cliente",
  debtor: "Debitore",
  retailer: "Punto vendita",
  carrier: "Trasportatore",
  supplier: "Fornitore",
  other: "Altro",
};

export default async function CounterpartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const membership = await requireMembership();
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";
  const counterparties = await listCounterparties(membership.organizationId, {
    includeInactive: showInactive,
  });

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">Controparti</div>
        <Link href="/counterparties/new" className="btn btn-primary" style={{ width: "auto" }}>
          Nuova controparte
        </Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Link href={showInactive ? "/counterparties" : "/counterparties?inactive=1"} className="muted">
          {showInactive ? "Mostra solo attive" : "Mostra anche non attive"}
        </Link>
      </div>

      <div className="card">
        {counterparties.length === 0 ? (
          <div className="empty-state">
            Nessuna controparte registrata. Crea la prima per iniziare a tracciare movimenti e buoni.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ragione sociale</th>
                <th>Codice</th>
                <th>Tipologia</th>
                <th>Città</th>
                <th>Email</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {counterparties.map((cp) => (
                <tr key={cp.id}>
                  <td>
                    <Link href={`/counterparties/${cp.id}/edit`}>{cp.legal_name}</Link>
                  </td>
                  <td>{cp.code ?? "—"}</td>
                  <td>{TYPE_LABELS[cp.counterparty_type] ?? cp.counterparty_type}</td>
                  <td>{cp.city ?? "—"}</td>
                  <td>{cp.email ?? "—"}</td>
                  <td>
                    <span className={`badge ${cp.active ? "badge-closed" : "badge-neutral"}`}>
                      {cp.active ? "Attiva" : "Non attiva"}
                    </span>
                  </td>
                  <td>
                    <form action={setCounterpartyActiveAction.bind(null, cp.id, !cp.active)}>
                      <button type="submit" className="btn btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}>
                        {cp.active ? "Disattiva" : "Riattiva"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
