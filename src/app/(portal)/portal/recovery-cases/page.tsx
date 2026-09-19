import { listPortalRecoveryCases } from "@/lib/data/portal";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
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
  const result = await listPortalRecoveryCases(page);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Pratiche di recupero</h2>
          <div className="panel-subtitle">Stato di avanzamento dei recuperi pallet in corso.</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">Nessuna pratica registrata.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pratica</th>
                <th>Pallet</th>
                <th>Recuperato</th>
                <th>Residuo</th>
                <th>Valore residuo</th>
                <th>Scadenza</th>
                <th>Stato</th>
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
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/portal/recovery-cases" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} />
    </section>
  );
}
