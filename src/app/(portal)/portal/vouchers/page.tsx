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
  const { formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Buoni pallet</h2>
          <div className="panel-subtitle">Crediti pallet emessi e relativo stato di recupero.</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">Nessun buono registrato.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Buono</th>
                <th>Pallet</th>
                <th>Emissione</th>
                <th>Scadenza</th>
                <th>Quantità</th>
                <th>Recuperato</th>
                <th>Residuo</th>
                <th>Stato</th>
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
