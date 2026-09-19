import Link from "next/link";
import { CircleDollarSign, ClipboardList, Plus, TriangleAlert } from "lucide-react";
import { listOrganizationMembers, requireMembership } from "@/lib/data/organization";
import { listRecoveryCasesPage } from "@/lib/data/recovery-cases";
import { getPageContext } from "@/i18n/server";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { AssigneePicker } from "@/components/assignee-picker";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

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
  searchParams: Promise<{ filter?: string; q?: string; page?: string; mine?: string }>;
}) {
  const membership = await requireMembership();
  const { formatCurrency, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { filter, q, page: pageParam, mine } = await searchParams;
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const page = parsePage(pageParam);
  const isMine = mine === "1";

  const [result, members] = await Promise.all([
    listRecoveryCasesPage(membership.organizationId, {
      statuses: activeFilter.statuses,
      search: q,
      assigneeUserId: isMine ? membership.userId : undefined,
      page,
    }),
    listOrganizationMembers(membership.organizationId),
  ]);
  const cases = result.items;

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

      <form method="get" className="search-bar">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        {isMine ? <input type="hidden" name="mine" value="1" /> : null}
        <input type="search" name="q" placeholder="Cerca per riferimento…" defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">Cerca</button>
      </form>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pratiche in questa pagina</span><span className="metric-icon"><ClipboardList size={17} /></span></div>
          <div className="metric-value">{formatNumber(cases.length)}</div>
          <div className="metric-foot">{formatNumber(result.total)} totali · {activeFilter.label.toLowerCase()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Esposizione</span><span className="metric-icon"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(exposure)}</div>
          <div className="metric-foot">{formatNumber(outstanding)} pallet residui, questa pagina</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Scadute</span><span className="metric-icon danger"><TriangleAlert size={17} /></span></div>
          <div className="metric-value">{formatNumber(overdue)}</div>
          <div className="metric-foot">nella pagina corrente</div>
        </div>
      </div>

      <div className="filter-bar">
        {FILTERS.map((item) => {
          const params = new URLSearchParams();
          if (item.key !== "open") params.set("filter", item.key);
          if (isMine) params.set("mine", "1");
          const qs = params.toString();
          return (
            <Link
              key={item.key}
              href={"/recovery-cases" + (qs ? "?" + qs : "")}
              className={"filter-pill" + (item.key === activeFilter.key ? " active" : "")}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href={
            "/recovery-cases?" +
            new URLSearchParams({ ...(filter ? { filter } : {}), ...(isMine ? {} : { mine: "1" }) }).toString()
          }
          className={"filter-pill" + (isMine ? " active" : "")}
        >
          La mia coda
        </Link>
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
                  <th>Assegnata a</th>
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
                    <td><PriorityBadge priority={item.priority} t={t} /></td>
                    <td><StatusBadge status={item.status} t={t} /></td>
                    <td>
                      <AssigneePicker caseId={item.id} assigneeUserId={item.assigneeUserId} members={members} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        basePath="/recovery-cases"
        params={{ filter, q, mine: isMine ? "1" : undefined }}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      t={t}
      />
    </div>
  );
}
