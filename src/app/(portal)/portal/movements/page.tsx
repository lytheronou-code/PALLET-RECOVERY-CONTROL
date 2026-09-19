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
  const { formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Movimenti pallet</h2>
          <div className="panel-subtitle">Flussi in ingresso e uscita registrati per la tua azienda.</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">Nessun movimento registrato.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Flusso</th>
                <th>Pallet</th>
                <th>Quantità</th>
                <th>Sito</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.movementDate)}</td>
                  <td>
                    <span className={"badge " + (item.direction === "outbound" ? "badge-open" : "badge-closed")}>
                      {item.direction === "outbound" ? "OUT" : "IN"}
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
      <Pagination basePath="/portal/movements" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} />
    </section>
  );
}
