import Link from "next/link";
import { Plus, Ticket, Upload } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listVouchersPage } from "@/lib/data/vouchers";
import { getPageContext } from "@/i18n/server";
import { VoucherStatusBadge } from "@/components/status-badge";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

const FILTERS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "active", label: "Attivi", statuses: ["open", "partial", "disputed"] },
  { key: "open", label: "Aperti", statuses: ["open"] },
  { key: "partial", label: "Parziali", statuses: ["partial"] },
  { key: "disputed", label: "Contestati", statuses: ["disputed"] },
  { key: "closed", label: "Chiusi", statuses: ["closed", "cancelled"] },
  { key: "all", label: "Tutti" },
];

function isOverdue(date: string | null, status: string): boolean {
  if (!date || !["open", "partial", "disputed"].includes(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date + "T00:00:00") < today;
}

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
  const { formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { filter, q, page: pageParam } = await searchParams;
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const page = parsePage(pageParam);
  const result = await listVouchersPage(membership.organizationId, {
    statuses: activeFilter.statuses,
    search: q,
    page,
  });
  const vouchers = result.items;

  const totalOutstanding = vouchers.reduce((sum, item) => sum + item.outstandingQuantity, 0);
  const overdueCount = vouchers.filter((item) => isOverdue(item.recoveryDueDate, item.status)).length;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Pallet credits</div>
          <h1 className="page-title">Buoni e crediti pallet</h1>
          <div className="page-subtitle">
            Scadenze, residui e collegamento diretto alle pratiche di recupero.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/import/vouchers" className="btn btn-secondary">
            <Upload size={14} />
            Import CSV
          </Link>
          <Link href="/vouchers/new" className="btn btn-primary">
            <Plus size={14} />
            Nuovo buono
          </Link>
        </div>
      </div>

      <form method="get" className="search-bar">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <input type="search" name="q" placeholder="Cerca per numero buono…" defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">Cerca</button>
      </form>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Buoni in vista</span>
            <span className="metric-icon"><Ticket size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(vouchers.length)}</div>
          <div className="metric-foot">filtrati per stato selezionato</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pallet residui</span></div>
          <div className="metric-value">{formatNumber(totalOutstanding)}</div>
          <div className="metric-foot">ancora da recuperare</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Scaduti</span></div>
          <div className="metric-value">{formatNumber(overdueCount)}</div>
          <div className="metric-foot">richiedono attenzione</div>
        </div>
      </div>

      <div className="filter-bar">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={"/vouchers?filter=" + item.key}
            className={"filter-pill" + (item.key === activeFilter.key ? " active" : "")}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="panel">
        {vouchers.length === 0 ? (
          <div className="empty-state">
            Nessun buono in questa vista. Registra un buono per alimentare scadenziario e riconciliazione.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buono</th>
                  <th>Controparte</th>
                  <th>Pallet</th>
                  <th>Emissione</th>
                  <th>Scadenza</th>
                  <th>Quantità</th>
                  <th>Recuperato</th>
                  <th>Residuo</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((item) => {
                  const overdue = isOverdue(item.recoveryDueDate, item.status);
                  const canRecover = item.outstandingQuantity > 0 && !["closed", "cancelled"].includes(item.status);
                  const params = new URLSearchParams({
                    counterpartyId: item.counterpartyId,
                    palletTypeId: item.palletTypeId,
                    voucherId: item.id,
                    quantity: String(item.outstandingQuantity),
                  });
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="row-title">{item.voucherNumber}</div>
                        {overdue ? <div className="row-subtitle" style={{ color: "var(--danger)" }}>Scaduto</div> : null}
                      </td>
                      <td><Link href={"/counterparties/" + item.counterpartyId}>{item.counterpartyName}</Link></td>
                      <td>{item.palletTypeCode}</td>
                      <td>{formatDate(item.issueDate)}</td>
                      <td>{formatDate(item.recoveryDueDate)}</td>
                      <td className="numeric">{formatNumber(item.quantity)}</td>
                      <td className="numeric">{formatNumber(item.recoveredQuantity)}</td>
                      <td className="numeric"><strong>{formatNumber(item.outstandingQuantity)}</strong></td>
                      <td><VoucherStatusBadge status={item.status} t={t} /></td>
                      <td>
                        {canRecover ? (
                          <Link href={"/recovery-cases/new?" + params.toString()} className="btn btn-secondary btn-sm">
                            Apri recovery
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        basePath="/vouchers"
        params={{ filter, q }}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      t={t}
      />
    </div>
  );
}
