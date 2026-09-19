import { getPortalContext, listPortalMovements } from "@/lib/data/portal";
import { getPageContext } from "@/i18n/server";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

export default async function PortalMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [context, result] = await Promise.all([getPortalContext(), listPortalMovements(page)]);
  const { t, formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{t("clientPortal.movements.title")}</h2>
          <div className="panel-subtitle">{t("clientPortal.movements.subtitle")}</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">{t("clientPortal.movements.empty")}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("clientPortal.movements.table.date")}</th>
                <th>{t("clientPortal.movements.table.flow")}</th>
                <th>{t("clientPortal.movements.table.pallet")}</th>
                <th>{t("clientPortal.movements.table.quantity")}</th>
                <th>{t("clientPortal.movements.table.site")}</th>
                <th>{t("clientPortal.movements.table.document")}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.movementDate)}</td>
                  <td>
                    <span className={"badge " + (item.direction === "outbound" ? "badge-open" : "badge-closed")}>
                      {item.direction === "outbound"
                        ? t("clientPortal.movements.direction.outbound")
                        : t("clientPortal.movements.direction.inbound")}
                    </span>
                  </td>
                  <td>{item.palletTypeCode}</td>
                  <td className="numeric">{formatNumber(item.quantity)}</td>
                  <td>{item.siteName ?? "—"}</td>
                  <td>{item.documentNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/portal/movements" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} t={t} />
    </section>
  );
}
