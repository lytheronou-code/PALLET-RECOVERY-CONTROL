import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Upload } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listMovements } from "@/lib/data/movements";
import { formatDate, formatNumber } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "Tutti" },
  { key: "outbound", label: "OUT" },
  { key: "inbound", label: "IN" },
] as const;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const membership = await requireMembership();
  const { direction } = await searchParams;
  const active = FILTERS.find((item) => item.key === direction) ?? FILTERS[0];
  const movements = await listMovements(membership.organizationId, {
    direction: active.key === "all" ? undefined : active.key,
  });

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
            <span className="metric-caption">Movimenti visualizzati</span>
          </div>
          <div className="metric-value">{formatNumber(movements.length)}</div>
          <div className="metric-foot">ultimi record della vista</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Pallet OUT</span>
            <span className="metric-icon warning"><ArrowUpRight size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(outbound)}</div>
          <div className="metric-foot">uscite nella vista corrente</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Pallet IN</span>
            <span className="metric-icon"><ArrowDownLeft size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(inbound)}</div>
          <div className="metric-foot">rientri nella vista corrente</div>
        </div>
      </div>

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
                  <th>Quantità</th>
                  <th>Documento</th>
                  <th>Buono</th>
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
                    </td>
                    <td>{item.palletTypeCode}</td>
                    <td className="numeric"><strong>{formatNumber(item.quantity)}</strong></td>
                    <td>
                      <div>{item.documentNumber ?? "—"}</div>
                      {item.documentType ? <div className="row-subtitle">{item.documentType}</div> : null}
                    </td>
                    <td>{item.voucherNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        La vista mostra fino a 250 movimenti recenti. Gli import completi restano tracciati per batch.
      </p>
    </div>
  );
}
