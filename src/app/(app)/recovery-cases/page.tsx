import Link from "next/link";
import { CircleDollarSign, ClipboardList, Plus, TriangleAlert } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listRecoveryCases } from "@/lib/data/recovery-cases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";

const FILTERS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "open", label: "Operative", statuses: ["open", "contacted", "scheduled", "partial", "disputed"] },
  { key: "recovered", label: "Recuperate", statuses: ["recovered"] },
  { key: "closed", label: "Chiuse", statuses: ["closed_unrecovered", "cancelled"] },
  { key: "all", label: "Tutte" },
];

function isOverdue(value: string | null, status: string): boolean {
  if (!value || !["open", "contacted", "scheduled", "partial", "disputed"].includes(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value + "T00:00:00") < today;
}

export default async function RecoveryCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const membership = await requireMembership();
  const { filter } = await searchParams;
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const cases = await listRecoveryCases(membership.organizationId, { statuses: activeFilter.statuses });

  const outstanding = cases.reduce((sum, item) => sum + Math.max(0, item.outstandingQuantity), 0);
  const exposure = cases.reduce((sum, item) => sum + Math.max(0, item.outstandingValue), 0);
  const overdue = cases.filter((item) => isOverdue(item.dueDate, item.status)).length;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Recovery operations</div>
          <h1 className="page-title">Pratiche di recupero</h1>
          <div className="page-subtitle">
            Coda operativa, priorità, scadenze e valore economico da recuperare.
          </div>
        </div>
        <Link href="/recovery-cases/new" className="btn btn-primary">
          <Plus size={14} />
          Nuova pratica
        </Link>
      </div>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pratiche nella vista</span><span className="metric-icon"><ClipboardList size={17} /></span></div>
          <div className="metric-value">{formatNumber(cases.length)}</div>
          <div className="metric-foot">{activeFilter.label.toLowerCase()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Esposizione</span><span className="metric-icon"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(exposure)}</div>
          <div className="metric-foot">{formatNumber(outstanding)} pallet residui</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Scadute</span><span className="metric-icon danger"><TriangleAlert size={17} /></span></div>
          <div className="metric-value">{formatNumber(overdue)}</div>
          <div className="metric-foot">nella vista corrente</div>
        </div>
      </div>

      <div className="filter-bar">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={"/recovery-cases?filter=" + item.key}
            className={"filter-pill" + (item.key === activeFilter.key ? " active" : "")}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="panel">
        {cases.length === 0 ? (
          <div className="empty-state">Nessuna pratica in questa vista.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pratica</th>
                  <th>Controparte</th>
                  <th>Pallet</th>
                  <th>Residuo</th>
                  <th>Esposizione</th>
                  <th>Scadenza</th>
                  <th>Priorità</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={"/recovery-cases/" + item.id}>
                        <div className="row-title">{item.reference}</div>
                        <div className="row-subtitle">
                          {formatNumber(item.quantityRecovered)} / {formatNumber(item.quantityClaimed)} recuperati
                        </div>
                      </Link>
                    </td>
                    <td>{item.counterpartyName}</td>
                    <td>{item.palletTypeCode}</td>
                    <td className="numeric"><strong>{formatNumber(item.outstandingQuantity)}</strong></td>
                    <td className="numeric">{formatCurrency(item.outstandingValue)}</td>
                    <td>
                      <span style={isOverdue(item.dueDate, item.status) ? { color: "var(--danger)", fontWeight: 700 } : undefined}>
                        {formatDate(item.dueDate)}
                      </span>
                    </td>
                    <td><PriorityBadge priority={item.priority} /></td>
                    <td><StatusBadge status={item.status} /></td>
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
