import { getPortalContext, listPortalRecoveryCases } from "@/lib/data/portal";
import { getPageContext } from "@/i18n/server";
import { StatusBadge } from "@/components/status-badge";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

export default async function PortalRecoveryCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [context, result] = await Promise.all([getPortalContext(), listPortalRecoveryCases(page)]);
  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{t("clientPortal.recoveryCases.title")}</h2>
          <div className="panel-subtitle">{t("clientPortal.recoveryCases.subtitle")}</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">{t("clientPortal.recoveryCases.empty")}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("clientPortal.recoveryCases.table.case")}</th>
                <th>{t("clientPortal.recoveryCases.table.pallet")}</th>
                <th>{t("clientPortal.recoveryCases.table.recovered")}</th>
                <th>{t("clientPortal.recoveryCases.table.outstanding")}</th>
                <th>{t("clientPortal.recoveryCases.table.outstandingValue")}</th>
                <th>{t("clientPortal.recoveryCases.table.dueDate")}</th>
                <th>{t("clientPortal.recoveryCases.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td className="row-title">{item.reference}</td>
                  <td>{item.palletTypeCode}</td>
                  <td className="numeric">{formatNumber(item.quantityRecovered)} / {formatNumber(item.quantityClaimed)}</td>
                  <td className="numeric">{formatNumber(item.outstandingQuantity)}</td>
                  <td className="numeric">{formatCurrency(item.outstandingValue)}</td>
                  <td>{formatDate(item.dueDate)}</td>
                  <td><StatusBadge status={item.status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/portal/recovery-cases" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} t={t} />
    </section>
  );
}
