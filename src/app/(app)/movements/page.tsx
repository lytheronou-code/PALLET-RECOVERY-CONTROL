import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Upload } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listMovementsPage } from "@/lib/data/movements";
import { formatDate, formatNumber } from "@/lib/format";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

const FILTERS = [
  { key: "all", label: "Tutti" },
  { key: "outbound", label: "OUT" },
  { key: "inbound", label: "IN" },
] as const;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
  const { direction, q, page: pageParam } = await searchParams;
  const active = FILTERS.find((item) => item.key === direction) ?? FILTERS[0];
  const page = parsePage(pageParam);
  const result = await listMovementsPage(membership.organizationId, {
    direction: active.key === "all" ? undefined : active.key,
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
          <div className="eyebrow">Movement ledger</div>
          <h1 className="page-title">Movimenti pallet</h1>
          <div className="page-subtitle">
            Il ledger operativo che alimenta riconciliazione, saldi e tracciabilità documentale.
          </div>
        </div>
        <Link href="/import" className="btn btn-primary">
          <Upload size={14} />
          Importa CSV
        </Link>
      </div>

      <div className="grid premium-kpis three">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Movimenti in questa pagina</span>
          </div>
          <div className="metric-value">{formatNumber(movements.length)}</div>
          <div className="metric-foot">{formatNumber(result.total)} totali nella vista</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Pallet OUT</span>
            <span className="metric-icon warning"><ArrowUpRight size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(outbound)}</div>
          <div className="metric-foot">uscite in questa pagina</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Pallet IN</span>
            <span className="metric-icon"><ArrowDownLeft size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(inbound)}</div>
          <div className="metric-foot">rientri in questa pagina</div>
        </div>
      </div>

      <form method="get" className="search-bar">
        {direction ? <input type="hidden" name="direction" value={direction} /> : null}
        <input type="search" name="q" placeholder="Cerca per numero documento o buono…" defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">Cerca</button>
      </form>

      <div className="filter-bar">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "/movements" : "/movements?direction=" + item.key}
            className={"filter-pill" + (item.key === active.key ? " active" : "")}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="panel">
        {movements.length === 0 ? (
          <div className="empty-state">Nessun movimento in questa vista.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Flusso</th>
                  <th>Controparte</th>
                  <th>Pallet</th>
                  <th>Sito</th>
                  <th>Quantità</th>
                  <th>Documento</th>
                  <th>Buono</th>
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
                        <div className="row-subtitle">correzione/storno</div>
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
                        <span className="badge badge-neutral">Corretto</span>
                      ) : (
                        <Link href={"/movements/" + item.id + "/correct"} className="btn btn-ghost btn-sm">
                          Correggi
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
      />
    </div>
  );
}
