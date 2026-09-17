import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listRecoveryCases } from "@/lib/data/recovery-cases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";

const FILTERS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "open", label: "Aperte", statuses: ["open", "contacted", "scheduled", "partial", "disputed"] },
  { key: "recovered", label: "Recuperate", statuses: ["recovered"] },
  { key: "closed", label: "Chiuse", statuses: ["closed_unrecovered", "cancelled"] },
  { key: "all", label: "Tutte" },
];

export default async function RecoveryCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const membership = await requireMembership();
  const { filter } = await searchParams;
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const cases = await listRecoveryCases(membership.organizationId, { statuses: activeFilter.statuses });

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">Recovery</div>
        <Link href="/recovery-cases/new" className="btn btn-primary" style={{ width: "auto" }}>
          Nuova pratica
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/recovery-cases?filter=${f.key}`}
            className={`badge ${f.key === activeFilter.key ? "badge-open" : "badge-neutral"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card">
        {cases.length === 0 ? (
          <div className="empty-state">Nessuna pratica in questa vista.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Riferimento</th>
                <th>Controparte</th>
                <th>Tipo pallet</th>
                <th>Outstanding</th>
                <th>Valore</th>
                <th>Scadenza</th>
                <th>Priorità</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/recovery-cases/${c.id}`}>{c.reference}</Link>
                  </td>
                  <td>{c.counterpartyName}</td>
                  <td>{c.palletTypeCode}</td>
                  <td>{formatNumber(c.outstandingQuantity)}</td>
                  <td>{formatCurrency(c.outstandingValue)}</td>
                  <td>{formatDate(c.dueDate)}</td>
                  <td>
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
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
