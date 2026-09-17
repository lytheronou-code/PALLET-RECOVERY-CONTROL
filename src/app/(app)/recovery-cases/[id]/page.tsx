import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getRecoveryCase, listRecoveryEvents } from "@/lib/data/recovery-cases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { RecoveryEventForm } from "@/components/recovery-event-form";
import { EVENT_LABELS } from "@/lib/recovery/labels";

export default async function RecoveryCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const [recoveryCase, events] = await Promise.all([
    getRecoveryCase(membership.organizationId, id),
    listRecoveryEvents(membership.organizationId, id),
  ]);

  if (!recoveryCase) {
    notFound();
  }

  const outstandingQuantity = recoveryCase.quantityClaimed - recoveryCase.quantityRecovered;
  const outstandingValue = outstandingQuantity * recoveryCase.unitValueSnapshot;

  return (
    <div className="shell" style={{ maxWidth: 900 }}>
      <div className="header">
        <div>
          <div className="brand">{recoveryCase.reference}</div>
          <div className="muted">
            {recoveryCase.counterpartyName} · {recoveryCase.palletTypeCode}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PriorityBadge priority={recoveryCase.priority} />
          <StatusBadge status={recoveryCase.status} />
        </div>
      </div>

      <div className="grid kpis" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="kpi-label">Richiesto</div>
          <div className="kpi-value">{formatNumber(recoveryCase.quantityClaimed)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Recuperato</div>
          <div className="kpi-value">{formatNumber(recoveryCase.quantityRecovered)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{formatNumber(outstandingQuantity)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Esposizione</div>
          <div className="kpi-value">{formatCurrency(outstandingValue)}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 14 }}>Dettagli</h2>
          <p style={{ fontSize: 14 }}>
            Valore unitario (snapshot): {formatCurrency(recoveryCase.unitValueSnapshot)}
            <br />
            Data apertura: {formatDate(recoveryCase.openedAt)}
            <br />
            Scadenza: {formatDate(recoveryCase.dueDate)}
          </p>
          {recoveryCase.notes ? <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{recoveryCase.notes}</p> : null}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 14 }}>Registra evento</h2>
          <RecoveryEventForm
            caseId={recoveryCase.id}
            quantityClaimed={recoveryCase.quantityClaimed}
            quantityRecovered={recoveryCase.quantityRecovered}
            status={recoveryCase.status}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 16 }}>Timeline</h2>
      <div className="card">
        {events.length === 0 ? (
          <div className="empty-state">Nessun evento registrato.</div>
        ) : (
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
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.occurredAt)}</td>
                  <td>{EVENT_LABELS[event.eventType as keyof typeof EVENT_LABELS] ?? event.eventType}</td>
                  <td>{event.quantity ?? "—"}</td>
                  <td>{event.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
