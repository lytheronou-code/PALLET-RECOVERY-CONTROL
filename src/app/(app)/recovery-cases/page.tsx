import Link from "next/link";
import { CircleDollarSign, ClipboardList, Plus, TriangleAlert } from "lucide-react";
import { listOrganizationMembers, requireMembership } from "@/lib/data/organization";
import { listRecoveryCasesPage } from "@/lib/data/recovery-cases";
import { getPageContext } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { AssigneePicker } from "@/components/assignee-picker";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

const FILTER_DEFINITIONS: { key: string; labelKey: TranslationKey; statuses?: string[] }[] = [
  { key: "open", labelKey: "recoveryCases.filters.open", statuses: ["open", "contacted", "scheduled", "partial", "disputed"] },
  { key: "recovered", labelKey: "recoveryCases.filters.recovered", statuses: ["recovered"] },
  { key: "closed", labelKey: "recoveryCases.filters.closed", statuses: ["closed_unrecovered", "cancelled"] },
  { key: "all", labelKey: "recoveryCases.filters.all" },
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
  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { filter, q, page: pageParam, mine } = await searchParams;
  const activeFilter = FILTER_DEFINITIONS.find((item) => item.key === filter) ?? FILTER_DEFINITIONS[0];
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
  const assigneePickerLabels = { unassigned: t("recoveryCases.unassigned") };

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("recoveryCases.eyebrow")}</div>
          <h1 className="page-title">{t("recoveryCases.title")}</h1>
          <div className="page-subtitle">
            {t("recoveryCases.subtitle")}
          </div>
        </div>
        <Link href="/recovery-cases/new" className="btn btn-primary">
          <Plus size={14} />
          {t("recoveryCases.new")}
        </Link>
      </div>

      <form method="get" className="search-bar">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        {isMine ? <input type="hidden" name="mine" value="1" /> : null}
        <input type="search" name="q" placeholder={t("recoveryCases.searchPlaceholder")} defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">{t("common.actions.search")}</button>
      </form>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.kpis.casesThisPage")}</span><span className="metric-icon"><ClipboardList size={17} /></span></div>
          <div className="metric-value">{formatNumber(cases.length)}</div>
          <div className="metric-foot">{t("recoveryCases.kpis.totalFiltered", { total: formatNumber(result.total), filter: t(activeFilter.labelKey) })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.kpis.exposure")}</span><span className="metric-icon"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(exposure)}</div>
          <div className="metric-foot">{t("recoveryCases.kpis.outstandingThisPage", { count: formatNumber(outstanding) })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.kpis.overdue")}</span><span className="metric-icon danger"><TriangleAlert size={17} /></span></div>
          <div className="metric-value">{formatNumber(overdue)}</div>
          <div className="metric-foot">{t("recoveryCases.kpis.overdueThisPage")}</div>
        </div>
      </div>

      <div className="filter-bar">
        {FILTER_DEFINITIONS.map((item) => {
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
              {t(item.labelKey)}
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
          {t("recoveryCases.myQueue")}
        </Link>
      </div>

      <div className="panel">
        {cases.length === 0 ? (
          <div className="empty-state">{t("recoveryCases.empty")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("recoveryCases.table.case")}</th>
                  <th>{t("recoveryCases.table.counterparty")}</th>
                  <th>{t("recoveryCases.table.pallet")}</th>
                  <th>{t("recoveryCases.table.outstanding")}</th>
                  <th>{t("recoveryCases.table.exposure")}</th>
                  <th>{t("recoveryCases.table.dueDate")}</th>
                  <th>{t("recoveryCases.table.priority")}</th>
                  <th>{t("recoveryCases.table.status")}</th>
                  <th>{t("recoveryCases.table.assignee")}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={"/recovery-cases/" + item.id}>
                        <div className="row-title">{item.reference}</div>
                        <div className="row-subtitle">
                          {t("recoveryCases.recoveredOfClaimed", {
                            recovered: formatNumber(item.quantityRecovered),
                            claimed: formatNumber(item.quantityClaimed),
                          })}
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
                      <AssigneePicker
                        caseId={item.id}
                        assigneeUserId={item.assigneeUserId}
                        members={members}
                        labels={assigneePickerLabels}
                      />
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
