import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, Pencil, Ticket } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getVoucherDetail } from "@/lib/data/vouchers";
import { cancelVoucherAction } from "@/lib/actions/vouchers";
import { getPageContext } from "@/i18n/server";
import { PriorityBadge, StatusBadge, VoucherStatusBadge } from "@/components/status-badge";
import { VoucherCancelForm } from "@/components/voucher-cancel-form";
import { DocumentsPanel } from "@/components/documents-panel";

export default async function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(membership.organizationId);
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
          <div className="eyebrow">{t("vouchers.detail.eyebrow")}</div>
          <h1 className="page-title">{voucher.voucherNumber}</h1>
          <div className="page-subtitle">{voucher.counterpartyName} · {voucher.palletTypeCode}</div>
        </div>
        <div className="header-actions">
          <VoucherStatusBadge status={voucher.status} t={t} />
          {canEdit ? (
            <Link href={"/vouchers/" + voucher.id + "/edit"} className="btn btn-secondary">
              <Pencil size={14} />
              {t("common.actions.edit")}
            </Link>
          ) : null}
          {canRecover ? (
            <Link href={"/recovery-cases/new?" + createParams.toString()} className="btn btn-primary">
              {t("vouchers.openRecovery")}
              <ArrowUpRight size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.detail.kpis.initialQuantity")}</span><span className="metric-icon"><Ticket size={17} /></span></div>
          <div className="metric-value">{formatNumber(voucher.quantity)}</div>
          <div className="metric-foot">{voucher.palletTypeCode}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.detail.kpis.recovered")}</span></div>
          <div className="metric-value">{formatNumber(voucher.recoveredQuantity)}</div>
          <div className="metric-foot">{t("vouchers.detail.kpis.recoveredFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.detail.kpis.outstanding")}</span></div>
          <div className="metric-value">{formatNumber(voucher.outstandingQuantity)}</div>
          <div className="metric-foot">{t("vouchers.detail.kpis.outstandingFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("vouchers.detail.kpis.estimatedResidualValue")}</span></div>
          <div className="metric-value">{formatCurrency(estimatedResidualValue)}</div>
          <div className="metric-foot">{t("vouchers.detail.kpis.estimatedResidualValueFoot")}</div>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("vouchers.detail.linkedCases.title")}</h2>
              <div className="panel-subtitle">{t("vouchers.detail.linkedCases.subtitle")}</div>
            </div>
          </div>
          {voucher.recoveryCases.length === 0 ? (
            <div className="empty-state">{t("vouchers.detail.linkedCases.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("vouchers.detail.linkedCases.table.case")}</th>
                    <th>{t("vouchers.detail.linkedCases.table.recovery")}</th>
                    <th>{t("vouchers.detail.linkedCases.table.dueDate")}</th>
                    <th>{t("vouchers.detail.linkedCases.table.priority")}</th>
                    <th>{t("vouchers.detail.linkedCases.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.recoveryCases.map((item) => (
                    <tr key={item.id}>
                      <td><Link className="row-title" href={"/recovery-cases/" + item.id}>{item.reference}</Link></td>
                      <td className="numeric">{formatNumber(item.quantityRecovered)} / {formatNumber(item.quantityClaimed)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} t={t} /></td>
                      <td><StatusBadge status={item.status} t={t} /></td>
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
              <h2 className="panel-title">{t("vouchers.detail.details.title")}</h2>
              <div className="panel-subtitle">{voucher.palletTypeDescription}</div>
            </div>
            <CalendarDays size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>{t("vouchers.detail.details.counterparty")}</dt><dd><Link href={"/counterparties/" + voucher.counterpartyId}>{voucher.counterpartyName}</Link></dd>
              <dt>{t("vouchers.detail.details.issueDate")}</dt><dd>{formatDate(voucher.issueDate)}</dd>
              <dt>{t("vouchers.detail.details.dueDate")}</dt><dd>{formatDate(voucher.recoveryDueDate)}</dd>
              <dt>{t("vouchers.detail.details.palletValue")}</dt><dd>{formatCurrency(voucher.unitValue)}</dd>
              <dt>{t("vouchers.detail.details.notes")}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{voucher.notes ?? t("vouchers.detail.details.notesEmpty")}</dd>
            </dl>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <VoucherCancelForm
                action={cancelVoucherAction.bind(null, voucher.id)}
                disabled={!canCancel}
                labels={{
                  confirmMessage: t("vouchers.cancelForm.confirmMessage"),
                  cancelButton: t("vouchers.cancelForm.cancelButton"),
                  cancelling: t("vouchers.cancelForm.cancelling"),
                }}
              />
              {!canCancel && voucher.status !== "cancelled" ? (
                <p className="muted" style={{ fontSize: 10, marginBottom: 0 }}>
                  {t("vouchers.detail.cancelBlockedNotice")}
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
