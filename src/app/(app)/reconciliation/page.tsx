import { requireMembership } from "@/lib/data/organization";
import { getReconciliation } from "@/lib/data/reconciliation";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Finding } from "@/lib/reconciliation/engine";

const FINDING_LABELS: Record<Finding["type"], string> = {
  unbalanced_movements: "Movimenti non bilanciati (OUT > IN)",
  open_voucher: "Buono aperto",
  duplicate_document: "Possibile documento duplicato",
  missing_documentation: "Movimento senza documento",
  voucher_due_soon: "Buono in scadenza",
  voucher_overdue: "Buono scaduto",
};

function describeFinding(finding: Finding, names: Map<string, { counterpartyName: string; palletTypeCode: string }>): string {
  switch (finding.type) {
    case "unbalanced_movements": {
      const key = `${finding.counterpartyId}::${finding.palletTypeId}`;
      const label = names.get(key);
      return `${label?.counterpartyName ?? "—"} · ${label?.palletTypeCode ?? "—"}: ${formatNumber(finding.outstandingQuantity)} pallet non rientrati`;
    }
    case "open_voucher": {
      const key = `${finding.counterpartyId}::${finding.palletTypeId}`;
      const label = names.get(key);
      return `${label?.counterpartyName ?? "—"} · ${label?.palletTypeCode ?? "—"}: buono aperto, ${formatNumber(finding.outstandingQuantity)} pallet residui`;
    }
    case "duplicate_document": {
      const key = `${finding.counterpartyId}::${finding.palletTypeId}`;
      const label = names.get(key);
      return `${label?.counterpartyName ?? "—"} · ${label?.palletTypeCode ?? "—"}: documento "${finding.documentNumber}" ripetuto su ${finding.movementIds.length} movimenti`;
    }
    case "missing_documentation": {
      const key = `${finding.counterpartyId}::${finding.palletTypeId}`;
      const label = names.get(key);
      return `${label?.counterpartyName ?? "—"} · ${label?.palletTypeCode ?? "—"}: movimento senza numero documento`;
    }
    case "voucher_due_soon":
      return `Buono in scadenza tra ${finding.daysUntilDue} giorni (${finding.dueDate})`;
    case "voucher_overdue":
      return `Buono scaduto da ${finding.daysOverdue} giorni (${finding.dueDate})`;
  }
}

export default async function ReconciliationPage() {
  const membership = await requireMembership();
  const { balances, findings } = await getReconciliation(membership.organizationId);

  const names = new Map(
    balances.map((b) => [`${b.counterpartyId}::${b.palletTypeId}`, { counterpartyName: b.counterpartyName, palletTypeCode: b.palletTypeCode }]),
  );

  const findingsByType = new Map<Finding["type"], Finding[]>();
  for (const finding of findings) {
    const list = findingsByType.get(finding.type) ?? [];
    list.push(finding);
    findingsByType.set(finding.type, list);
  }

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">Riconciliazione</div>
      </div>

      <p className="muted" style={{ marginTop: -8, marginBottom: 20, maxWidth: 720 }}>
        Motore deterministico, nessuna AI: confronta i movimenti OUT/IN e i buoni registrati e segnala anomalie
        operative. Non crea automaticamente pratiche di recupero — le pratiche vengono aperte manualmente a partire
        da queste segnalazioni.
      </p>

      <h2 style={{ fontSize: 16 }}>Saldo per controparte / tipo pallet</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        {balances.length === 0 ? (
          <div className="empty-state">Nessun movimento o buono registrato ancora.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Controparte</th>
                <th>Tipo pallet</th>
                <th>OUT</th>
                <th>IN</th>
                <th>Saldo teorico</th>
                <th>Buoni aperti</th>
                <th>Outstanding</th>
                <th>Valore</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={`${b.counterpartyId}::${b.palletTypeId}`}>
                  <td>{b.counterpartyName}</td>
                  <td>{b.palletTypeCode}</td>
                  <td>{formatNumber(b.outboundQuantity)}</td>
                  <td>{formatNumber(b.inboundQuantity)}</td>
                  <td>{formatNumber(b.theoreticalBalance)}</td>
                  <td>{formatNumber(b.voucherOpenQuantity)}</td>
                  <td>{formatNumber(b.outstandingQuantity)}</td>
                  <td>{formatCurrency(b.outstandingValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ fontSize: 16 }}>Segnalazioni operative ({findings.length})</h2>
      {findings.length === 0 ? (
        <div className="card empty-state">Nessuna anomalia rilevata.</div>
      ) : (
        Array.from(findingsByType.entries()).map(([type, items]) => (
          <div className="card" key={type} style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>
              {FINDING_LABELS[type]} ({items.length})
            </h3>
            <table className="data-table">
              <tbody>
                {items.slice(0, 50).map((finding, idx) => (
                  <tr key={idx}>
                    <td>{describeFinding(finding, names)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length > 50 ? <p className="muted">+{items.length - 50} altre</p> : null}
          </div>
        ))
      )}
    </div>
  );
}
