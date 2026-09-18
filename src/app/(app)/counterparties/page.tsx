import Link from "next/link";
import { Building2, Plus } from "lucide-react";
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
        <div className="page-heading">
          <div className="eyebrow">Network</div>
          <h1 className="page-title">Controparti</h1>
          <div className="page-subtitle">
            Clienti, debitori, punti vendita e partner coinvolti nei flussi pallet.
          </div>
        </div>
        <Link href="/counterparties/new" className="btn btn-primary">
          <Plus size={14} />
          Nuova controparte
        </Link>
      </div>

      <div className="filter-bar">
        <Link href={showInactive ? "/counterparties" : "/counterparties?inactive=1"} className={"filter-pill" + (showInactive ? " active" : "")}>
          {showInactive ? "Incluse non attive" : "Mostra non attive"}
        </Link>
      </div>

      <div className="panel">
        {counterparties.length === 0 ? (
          <div className="empty-state">
            <Building2 size={24} style={{ marginBottom: 8 }} />
            <div>Nessuna controparte registrata.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ragione sociale</th>
                  <th>Codice</th>
                  <th>Tipologia</th>
                  <th>Località</th>
                  <th>Contatto</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => (
                  <tr key={cp.id}>
                    <td>
                      <Link href={"/counterparties/" + cp.id}>
                        <div className="row-title">{cp.legal_name}</div>
                        <div className="row-subtitle">{cp.vat_number ?? "P. IVA non indicata"}</div>
                      </Link>
                    </td>
                    <td>{cp.code ?? "—"}</td>
                    <td>{TYPE_LABELS[cp.counterparty_type] ?? cp.counterparty_type}</td>
                    <td>{[cp.city, cp.province].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{cp.email ?? cp.phone ?? "—"}</td>
                    <td>
                      <span className={"badge " + (cp.active ? "badge-closed" : "badge-neutral")}>
                        {cp.active ? "Attiva" : "Non attiva"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={"/counterparties/" + cp.id} className="btn btn-secondary btn-sm">Apri</Link>
                        <form action={setCounterpartyActiveAction.bind(null, cp.id, !cp.active)}>
                          <button type="submit" className="btn btn-ghost btn-sm">
                            {cp.active ? "Disattiva" : "Riattiva"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
