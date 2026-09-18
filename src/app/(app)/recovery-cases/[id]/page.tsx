import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CircleDollarSign, PackageCheck } from "lucide-react";
import { listOrganizationMembers, requireMembership } from "@/lib/data/organization";
import { getRecoveryCase, listRecoveryEvents } from "@/lib/data/recovery-cases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { RecoveryEventForm } from "@/components/recovery-event-form";
import { AssigneePicker } from "@/components/assignee-picker";
import { DocumentsPanel } from "@/components/documents-panel";
import { EVENT_LABELS } from "@/lib/recovery/labels";

export default async function RecoveryCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
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

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Recovery case</div>
          <h1 className="page-title">{recoveryCase.reference}</h1>
          <div className="page-subtitle">
            <Link href={"/counterparties/" + recoveryCase.counterpartyId}>{recoveryCase.counterpartyName}</Link>
            {" · "}{recoveryCase.palletTypeCode}
          </div>
        </div>
        <div className="header-actions">
          <PriorityBadge priority={recoveryCase.priority} />
          <StatusBadge status={recoveryCase.status} />
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Richiesto</span><span className="metric-icon"><PackageCheck size={17} /></span></div>
          <div className="metric-value">{formatNumber(recoveryCase.quantityClaimed)}</div>
          <div className="metric-foot">{recoveryCase.palletTypeCode}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Recuperato</span></div>
          <div className="metric-value">{formatNumber(recoveryCase.quantityRecovered)}</div>
          <div className="metric-foot">{completion}% completato</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Residuo</span></div>
          <div className="metric-value">{formatNumber(outstandingQuantity)}</div>
          <div className="metric-foot">pallet da chiudere</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Esposizione</span><span className="metric-icon danger"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(outstandingValue)}</div>
          <div className="metric-foot">valore residuo stimato</div>
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Dossier pratica</h2>
              <div className="panel-subtitle">Informazioni che governano il recupero.</div>
            </div>
            <CalendarDays size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>Data apertura</dt><dd>{formatDate(recoveryCase.openedAt)}</dd>
              <dt>Scadenza</dt><dd>{formatDate(recoveryCase.dueDate)}</dd>
              <dt>Sito</dt><dd>{recoveryCase.siteName ?? "—"}</dd>
              <dt>Valore unitario</dt><dd>{formatCurrency(recoveryCase.unitValueSnapshot)}</dd>
              <dt>Buono collegato</dt>
              <dd>
                {recoveryCase.voucherId
                  ? <Link href={"/vouchers/" + recoveryCase.voucherId}>Apri buono</Link>
                  : "—"}
              </dd>
              <dt>Assegnata a</dt>
              <dd>
                <AssigneePicker caseId={recoveryCase.id} assigneeUserId={recoveryCase.assigneeUserId} members={members} />
              </dd>
              <dt>Note</dt><dd style={{ whiteSpace: "pre-wrap" }}>{recoveryCase.notes ?? "—"}</dd>
            </dl>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Registra attività</h2>
              <div className="panel-subtitle">Ogni evento aggiorna timeline e stato.</div>
            </div>
          </div>
          <div className="panel-body">
            <RecoveryEventForm
              caseId={recoveryCase.id}
              quantityClaimed={recoveryCase.quantityClaimed}
              quantityRecovered={recoveryCase.quantityRecovered}
              status={recoveryCase.status}
            />
          </div>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Timeline operativa</h2>
            <div className="panel-subtitle">{events.length} eventi registrati</div>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">Nessun evento registrato.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Evento</th>
                  <th>Quantità</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {[...events].reverse().map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.occurredAt)}</td>
                    <td className="row-title">{EVENT_LABELS[event.eventType as keyof typeof EVENT_LABELS] ?? event.eventType}</td>
                    <td className="numeric">{event.quantity ?? "—"}</td>
                    <td>{event.notes ?? "—"}</td>
                  </tr>
                ))}
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
