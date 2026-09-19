import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CircleDollarSign, PackageCheck } from "lucide-react";
import { listOrganizationMembers, requireMembership } from "@/lib/data/organization";
import { getRecoveryCase, listRecoveryEvents } from "@/lib/data/recovery-cases";
import { getPageContext } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { RecoveryEventForm, type RecoveryEventFormLabels } from "@/components/recovery-event-form";
import { AssigneePicker } from "@/components/assignee-picker";
import { DocumentsPanel } from "@/components/documents-panel";
import { EVENT_LABEL_KEYS } from "@/lib/recovery/labels";
import { RECOVERY_EVENT_TYPES } from "@/lib/validation/recovery-case";

// Same pattern as status-badge.tsx's STATUS_LABEL_KEYS: a dictionary keyed
// by the stored recovery_cases.status enum value, feeding t(). Defined
// locally (rather than importing status-badge.tsx's, which isn't exported)
// because only this page needs to resolve a case status to plain text for
// the "use client" RecoveryEventForm's preview sentence.
const CASE_STATUS_LABEL_KEYS = {
  open: "common.status.recoveryCase.open",
  contacted: "common.status.recoveryCase.contacted",
  scheduled: "common.status.recoveryCase.scheduled",
  partial: "common.status.recoveryCase.partial",
  recovered: "common.status.recoveryCase.recovered",
  disputed: "common.status.recoveryCase.disputed",
  closed_unrecovered: "common.status.recoveryCase.closed_unrecovered",
  cancelled: "common.status.recoveryCase.cancelled",
} as const satisfies Record<string, TranslationKey>;

export default async function RecoveryCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const [recoveryCase, events, members] = await Promise.all([
    getRecoveryCase(membership.organizationId, id),
    listRecoveryEvents(membership.organizationId, id),
    listOrganizationMembers(membership.organizationId),
  ]);

  if (!recoveryCase) notFound();

  const outstandingQuantity = Math.max(0, recoveryCase.quantityClaimed - recoveryCase.quantityRecovered);
  const outstandingValue = outstandingQuantity * recoveryCase.unitValueSnapshot;
  const completion = recoveryCase.quantityClaimed > 0
    ? Math.round((recoveryCase.quantityRecovered / recoveryCase.quantityClaimed) * 100)
    : 0;

  const statusLabels = Object.fromEntries(
    Object.entries(CASE_STATUS_LABEL_KEYS).map(([status, key]) => [status, t(key)]),
  );

  const eventTypeOptions = Object.fromEntries(
    RECOVERY_EVENT_TYPES.map((type) => [type, t(EVENT_LABEL_KEYS[type])]),
  ) as RecoveryEventFormLabels["eventTypeOptions"];

  const eventFormLabels: RecoveryEventFormLabels = {
    closedCaseNotice: t("recoveryCases.eventForm.closedCaseNotice"),
    eventType: t("recoveryCases.eventForm.eventType"),
    eventTypeOptions,
    quantityRemainingTemplate: t("recoveryCases.eventForm.quantityRemaining"),
    recoveredTotalPreviewTemplate: t("recoveryCases.eventForm.recoveredTotalPreview"),
    notes: t("recoveryCases.eventForm.notes"),
    saving: t("recoveryCases.eventForm.saving"),
    addEvent: t("recoveryCases.eventForm.addEvent"),
    statusLabels,
  };

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("recoveryCases.detail.eyebrow")}</div>
          <h1 className="page-title">{recoveryCase.reference}</h1>
          <div className="page-subtitle">
            <Link href={"/counterparties/" + recoveryCase.counterpartyId}>{recoveryCase.counterpartyName}</Link>
            {" · "}{recoveryCase.palletTypeCode}
          </div>
        </div>
        <div className="header-actions">
          <PriorityBadge priority={recoveryCase.priority} t={t} />
          <StatusBadge status={recoveryCase.status} t={t} />
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.detail.kpis.claimed")}</span><span className="metric-icon"><PackageCheck size={17} /></span></div>
          <div className="metric-value">{formatNumber(recoveryCase.quantityClaimed)}</div>
          <div className="metric-foot">{recoveryCase.palletTypeCode}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.detail.kpis.recovered")}</span></div>
          <div className="metric-value">{formatNumber(recoveryCase.quantityRecovered)}</div>
          <div className="metric-foot">{t("recoveryCases.detail.kpis.completed", { percent: completion })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.detail.kpis.outstanding")}</span></div>
          <div className="metric-value">{formatNumber(outstandingQuantity)}</div>
          <div className="metric-foot">{t("recoveryCases.detail.kpis.palletsToClose")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("recoveryCases.detail.kpis.exposure")}</span><span className="metric-icon danger"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(outstandingValue)}</div>
          <div className="metric-foot">{t("recoveryCases.detail.kpis.estimatedOutstandingValue")}</div>
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("recoveryCases.detail.dossier.title")}</h2>
              <div className="panel-subtitle">{t("recoveryCases.detail.dossier.subtitle")}</div>
            </div>
            <CalendarDays size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>{t("recoveryCases.detail.dossier.openedDate")}</dt><dd>{formatDate(recoveryCase.openedAt)}</dd>
              <dt>{t("recoveryCases.detail.dossier.dueDate")}</dt><dd>{formatDate(recoveryCase.dueDate)}</dd>
              <dt>{t("recoveryCases.detail.dossier.site")}</dt><dd>{recoveryCase.siteName ?? "—"}</dd>
              <dt>{t("recoveryCases.detail.dossier.unitValue")}</dt><dd>{formatCurrency(recoveryCase.unitValueSnapshot)}</dd>
              <dt>{t("recoveryCases.detail.dossier.linkedVoucher")}</dt>
              <dd>
                {recoveryCase.voucherId
                  ? <Link href={"/vouchers/" + recoveryCase.voucherId}>{t("recoveryCases.detail.dossier.openVoucher")}</Link>
                  : "—"}
              </dd>
              <dt>{t("recoveryCases.detail.dossier.assignee")}</dt>
              <dd>
                <AssigneePicker
                  caseId={recoveryCase.id}
                  assigneeUserId={recoveryCase.assigneeUserId}
                  members={members}
                  labels={{ unassigned: t("recoveryCases.unassigned") }}
                />
              </dd>
              <dt>{t("recoveryCases.detail.dossier.notes")}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{recoveryCase.notes ?? "—"}</dd>
            </dl>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("recoveryCases.detail.activity.title")}</h2>
              <div className="panel-subtitle">{t("recoveryCases.detail.activity.subtitle")}</div>
            </div>
          </div>
          <div className="panel-body">
            <RecoveryEventForm
              caseId={recoveryCase.id}
              quantityClaimed={recoveryCase.quantityClaimed}
              quantityRecovered={recoveryCase.quantityRecovered}
              status={recoveryCase.status}
              labels={eventFormLabels}
            />
          </div>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("recoveryCases.detail.timeline.title")}</h2>
            <div className="panel-subtitle">{t("recoveryCases.detail.timeline.subtitleCount", { count: events.length })}</div>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">{t("recoveryCases.detail.timeline.empty")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("recoveryCases.detail.timeline.table.date")}</th>
                  <th>{t("recoveryCases.detail.timeline.table.event")}</th>
                  <th>{t("recoveryCases.detail.timeline.table.quantity")}</th>
                  <th>{t("recoveryCases.detail.timeline.table.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {[...events].reverse().map((event) => {
                  const labelKey = EVENT_LABEL_KEYS[event.eventType as keyof typeof EVENT_LABEL_KEYS];
                  return (
                    <tr key={event.id}>
                      <td>{formatDate(event.occurredAt)}</td>
                      <td className="row-title">{labelKey ? t(labelKey) : event.eventType}</td>
                      <td className="numeric">{event.quantity ?? "—"}</td>
                      <td>{event.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ marginTop: 16 }}>
        <DocumentsPanel
          link={{
            counterpartyId: recoveryCase.counterpartyId,
            entity: "recovery-case",
            entityId: recoveryCase.id,
            recoveryCaseId: recoveryCase.id,
          }}
        />
      </div>
    </div>
  );
}
