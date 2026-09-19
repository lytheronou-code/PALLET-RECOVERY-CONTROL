import { getPortalContext, listPortalVouchers } from "@/lib/data/portal";
import { getPageContext } from "@/i18n/server";
import { VoucherStatusBadge } from "@/components/status-badge";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

export default async function PortalVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [context, result] = await Promise.all([getPortalContext(), listPortalVouchers(page)]);
  const { t, formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{t("clientPortal.vouchers.title")}</h2>
          <div className="panel-subtitle">{t("clientPortal.vouchers.subtitle")}</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">{t("clientPortal.vouchers.empty")}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("clientPortal.vouchers.table.voucher")}</th>
                <th>{t("clientPortal.vouchers.table.pallet")}</th>
                <th>{t("clientPortal.vouchers.table.issued")}</th>
                <th>{t("clientPortal.vouchers.table.dueDate")}</th>
                <th>{t("clientPortal.vouchers.table.quantity")}</th>
                <th>{t("clientPortal.vouchers.table.recovered")}</th>
                <th>{t("clientPortal.vouchers.table.outstanding")}</th>
                <th>{t("clientPortal.vouchers.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td className="row-title">{item.voucherNumber}</td>
                  <td>{item.palletTypeCode}</td>
                  <td>{formatDate(item.issueDate)}</td>
                  <td>{formatDate(item.recoveryDueDate)}</td>
                  <td className="numeric">{formatNumber(item.quantity)}</td>
                  <td className="numeric">{formatNumber(item.recoveredQuantity)}</td>
                  <td className="numeric"><strong>{formatNumber(item.outstandingQuantity)}</strong></td>
                  <td><VoucherStatusBadge status={item.status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/portal/vouchers" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} t={t} />
    </section>
  );
}
