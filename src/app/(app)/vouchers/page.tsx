import Link from "next/link";
import { Plus, Ticket, Upload } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listVouchersPage } from "@/lib/data/vouchers";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import { VoucherStatusBadge } from "@/components/status-badge";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

function buildFilters(t: Translator): { key: string; label: string; statuses?: string[] }[] {
  return [
    { key: "active", label: t("vouchers.list.filters.active"), statuses: ["open", "partial", "disputed"] },
    { key: "open", label: t("vouchers.list.filters.open"), statuses: ["open"] },
    { key: "partial", label: t("vouchers.list.filters.partial"), statuses: ["partial"] },
    { key: "disputed", label: t("vouchers.list.filters.disputed"), statuses: ["disputed"] },
    { key: "closed", label: t("vouchers.list.filters.closed"), statuses: ["closed", "cancelled"] },
    { key: "all", label: t("vouchers.list.filters.all") },
  ];
}

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
  const { t, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const FILTERS = buildFilters(t);
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
          <div className="eyebrow">{t("vouchers.list.eyebrow")}</div>
          <h1 className="page-title">{t("vouchers.title")}</h1>
          <div className="page-subtitle">{t("vouchers.list.subtitle")}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/import/vouchers" className="btn btn-secondary">
            <Upload size={14} />
            {t("movements.importCsv")}
          </Link>
          <Link href="/vouchers/new" className="btn btn-primary">
            <Plus size={14} />
            {t("vouchers.new")}
          </Link>
        </div>
      </div>

      <form method="get" className="search-bar">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <input type="search" name="q" placeholder={t("vouchers.list.searchPlaceholder")} defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">{t("common.actions.search")}</button>
      </form>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("vouchers.list.kpis.inView")}</span>
            <span className="metric-icon"><Ticket size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(vouchers.length)}</div>
          <div className="metric-foot">{t("vouchers.list.kpis.inViewFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.list.kpis.outstandingPallets")}</span></div>
          <div className="metric-value">{formatNumber(totalOutstanding)}</div>
          <div className="metric-foot">{t("vouchers.list.kpis.outstandingPalletsFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.list.kpis.overdue")}</span></div>
          <div className="metric-value">{formatNumber(overdueCount)}</div>
          <div className="metric-foot">{t("vouchers.list.kpis.overdueFoot")}</div>
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
            {t("vouchers.list.empty")}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("vouchers.list.table.voucher")}</th>
                  <th>{t("vouchers.list.table.counterparty")}</th>
                  <th>{t("vouchers.list.table.pallet")}</th>
                  <th>{t("vouchers.list.table.issueDate")}</th>
                  <th>{t("vouchers.list.table.dueDate")}</th>
                  <th>{t("vouchers.list.table.quantity")}</th>
                  <th>{t("vouchers.list.table.recovered")}</th>
                  <th>{t("vouchers.list.table.outstanding")}</th>
                  <th>{t("vouchers.list.table.status")}</th>
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
                        {overdue ? <div className="row-subtitle" style={{ color: "var(--danger)" }}>{t("vouchers.list.overdueLabel")}</div> : null}
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
                            {t("vouchers.openRecovery")}
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
