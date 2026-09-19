import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, Pencil, Ticket } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getVoucherDetail } from "@/lib/data/vouchers";
import { cancelVoucherAction } from "@/lib/actions/vouchers";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge, VoucherStatusBadge } from "@/components/status-badge";
import { VoucherCancelForm } from "@/components/voucher-cancel-form";
import { DocumentsPanel } from "@/components/documents-panel";

export default async function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const voucher = await getVoucherDetail(membership.organizationId, id);

  if (!voucher) notFound();

  const estimatedResidualValue = voucher.outstandingQuantity * voucher.unitValue;
  const canRecover = voucher.outstandingQuantity > 0 && !["closed", "cancelled"].includes(voucher.status);
  const canEdit = voucher.status !== "cancelled";
  const canCancel = voucher.status !== "cancelled" && voucher.recoveredQuantity === 0 && voucher.recoveryCases.length === 0;
  const createParams = new URLSearchParams({
    counterpartyId: voucher.counterpartyId,
    palletTypeId: voucher.palletTypeId,
    voucherId: voucher.id,
    quantity: String(voucher.outstandingQuantity),
  });

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Pallet credit</div>
          <h1 className="page-title">{voucher.voucherNumber}</h1>
          <div className="page-subtitle">{voucher.counterpartyName} · {voucher.palletTypeCode}</div>
        </div>
        <div className="header-actions">
          <VoucherStatusBadge status={voucher.status} />
          {canEdit ? (
            <Link href={"/vouchers/" + voucher.id + "/edit"} className="btn btn-secondary">
              <Pencil size={14} />
              Modifica
            </Link>
          ) : null}
          {canRecover ? (
            <Link href={"/recovery-cases/new?" + createParams.toString()} className="btn btn-primary">
              Apri recovery
              <ArrowUpRight size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Quantità iniziale</span><span className="metric-icon"><Ticket size={17} /></span></div>
          <div className="metric-value">{formatNumber(voucher.quantity)}</div>
          <div className="metric-foot">{voucher.palletTypeCode}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Recuperato</span></div>
          <div className="metric-value">{formatNumber(voucher.recoveredQuantity)}</div>
          <div className="metric-foot">registrato dalle pratiche collegate</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Residuo</span></div>
          <div className="metric-value">{formatNumber(voucher.outstandingQuantity)}</div>
          <div className="metric-foot">ancora da recuperare</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Valore residuo stimato</span></div>
          <div className="metric-value">{formatCurrency(estimatedResidualValue)}</div>
          <div className="metric-foot">al valore unitario corrente del pallet</div>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pratiche collegate</h2>
              <div className="panel-subtitle">Recovery che aggiornano automaticamente questo buono.</div>
            </div>
          </div>
          {voucher.recoveryCases.length === 0 ? (
            <div className="empty-state">Nessuna pratica collegata.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Pratica</th><th>Recupero</th><th>Scadenza</th><th>Priorità</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  {voucher.recoveryCases.map((item) => (
                    <tr key={item.id}>
                      <td><Link className="row-title" href={"/recovery-cases/" + item.id}>{item.reference}</Link></td>
                      <td className="numeric">{formatNumber(item.quantityRecovered)} / {formatNumber(item.quantityClaimed)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} /></td>
                      <td><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Dettagli buono</h2>
              <div className="panel-subtitle">{voucher.palletTypeDescription}</div>
            </div>
            <CalendarDays size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>Controparte</dt><dd><Link href={"/counterparties/" + voucher.counterpartyId}>{voucher.counterpartyName}</Link></dd>
              <dt>Emissione</dt><dd>{formatDate(voucher.issueDate)}</dd>
              <dt>Scadenza</dt><dd>{formatDate(voucher.recoveryDueDate)}</dd>
              <dt>Valore pallet</dt><dd>{formatCurrency(voucher.unitValue)}</dd>
              <dt>Note</dt><dd style={{ whiteSpace: "pre-wrap" }}>{voucher.notes ?? "—"}</dd>
            </dl>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <VoucherCancelForm
                action={cancelVoucherAction.bind(null, voucher.id)}
                disabled={!canCancel}
              />
              {!canCancel && voucher.status !== "cancelled" ? (
                <p className="muted" style={{ fontSize: 10, marginBottom: 0 }}>
                  L&apos;annullamento è bloccato se esistono pratiche collegate o recuperi già registrati.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 16 }}>
        <DocumentsPanel
          link={{
            counterpartyId: voucher.counterpartyId,
            entity: "voucher",
            entityId: voucher.id,
            voucherId: voucher.id,
          }}
        />
      </div>
    </div>
  );
}
