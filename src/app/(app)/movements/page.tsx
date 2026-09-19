import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Upload } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listMovementsPage } from "@/lib/data/movements";
import { getPageContext } from "@/i18n/server";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

const FILTER_KEYS = ["all", "outbound", "inbound"] as const;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { direction, q, page: pageParam } = await searchParams;
  const activeKey = FILTER_KEYS.find((key) => key === direction) ?? "all";
  const page = parsePage(pageParam);
  const result = await listMovementsPage(membership.organizationId, {
    direction: activeKey === "all" ? undefined : activeKey,
    search: q,
    page,
  });
  const movements = result.items;

  const inbound = movements.filter((item) => item.direction === "inbound").reduce((sum, item) => sum + item.quantity, 0);
  const outbound = movements.filter((item) => item.direction === "outbound").reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("movements.eyebrow")}</div>
          <h1 className="page-title">{t("movements.title")}</h1>
          <div className="page-subtitle">{t("movements.subtitle")}</div>
        </div>
        <Link href="/import" className="btn btn-primary">
          <Upload size={14} />
          {t("movements.importCsv")}
        </Link>
      </div>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("movements.kpis.movementsThisPage")}</span>
          </div>
          <div className="metric-value">{formatNumber(movements.length)}</div>
          <div className="metric-foot">{formatNumber(result.total)} {t("movements.kpis.totalInView")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("movements.kpis.palletsOut")}</span>
            <span className="metric-icon warning"><ArrowUpRight size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(outbound)}</div>
          <div className="metric-foot">{t("movements.kpis.outboundThisPage")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("movements.kpis.palletsIn")}</span>
            <span className="metric-icon"><ArrowDownLeft size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(inbound)}</div>
          <div className="metric-foot">{t("movements.kpis.inboundThisPage")}</div>
        </div>
      </div>

      <form method="get" className="search-bar">
        {direction ? <input type="hidden" name="direction" value={direction} /> : null}
        <input type="search" name="q" placeholder={t("movements.searchPlaceholder")} defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">{t("common.actions.search")}</button>
      </form>

      <div className="filter-bar">
        {FILTER_KEYS.map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/movements" : "/movements?direction=" + key}
            className={"filter-pill" + (key === activeKey ? " active" : "")}
          >
            {t(`movements.filters.${key}`)}
          </Link>
        ))}
      </div>

      <div className="panel">
        {movements.length === 0 ? (
          <div className="empty-state">{t("movements.empty")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("movements.table.date")}</th>
                  <th>{t("movements.table.flow")}</th>
                  <th>{t("movements.table.counterparty")}</th>
                  <th>{t("movements.table.pallet")}</th>
                  <th>{t("movements.table.site")}</th>
                  <th>{t("movements.table.quantity")}</th>
                  <th>{t("movements.table.document")}</th>
                  <th>{t("movements.table.voucher")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movements.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.movementDate)}</td>
                    <td>
                      <span className={"badge " + (item.direction === "outbound" ? "badge-open" : "badge-closed")}>
                        {item.direction === "outbound" ? "OUT" : "IN"}
                      </span>
                    </td>
                    <td>
                      <Link href={"/counterparties/" + item.counterpartyId} className="row-title">
                        {item.counterpartyName}
                      </Link>
                      {item.correctionOfMovementId ? (
                        <div className="row-subtitle">{t("movements.correctionNote")}</div>
                      ) : null}
                    </td>
                    <td>{item.palletTypeCode}</td>
                    <td>{item.siteName ?? "—"}</td>
                    <td className="numeric"><strong>{formatNumber(item.quantity)}</strong></td>
                    <td>
                      <div>{item.documentNumber ?? "—"}</div>
                      {item.documentType ? <div className="row-subtitle">{item.documentType}</div> : null}
                    </td>
                    <td>{item.voucherNumber ?? "—"}</td>
                    <td>
                      {item.isCorrected ? (
                        <span className="badge badge-neutral">{t("movements.corrected")}</span>
                      ) : (
                        <Link href={"/movements/" + item.id + "/correct"} className="btn btn-ghost btn-sm">
                          {t("movements.correct")}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        basePath="/movements"
        params={{ direction, q }}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        t={t}
      />
    </div>
  );
}
