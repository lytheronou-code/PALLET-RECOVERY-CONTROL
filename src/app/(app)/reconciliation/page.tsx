import Link from "next/link";
import { AlertTriangle, GitCompareArrows, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getReconciliation } from "@/lib/data/reconciliation";
import { getPageContext } from "@/i18n/server";
import type { Finding } from "@/lib/reconciliation/engine";

function createCaseHref(finding: Finding): string | null {
  if (finding.type === "unbalanced_movements") {
    const params = new URLSearchParams({
      counterpartyId: finding.counterpartyId,
      palletTypeId: finding.palletTypeId,
      quantity: String(finding.outstandingQuantity),
    });
    return "/recovery-cases/new?" + params.toString();
  }
  if (finding.type === "open_voucher") {
    const params = new URLSearchParams({
      counterpartyId: finding.counterpartyId,
      palletTypeId: finding.palletTypeId,
      voucherId: finding.voucherId,
      quantity: String(finding.outstandingQuantity),
    });
    return "/recovery-cases/new?" + params.toString();
  }
  return null;
}

const FINDING_LABELS: Record<Finding["type"], string> = {
  unbalanced_movements: "Movimenti non bilanciati",
  open_voucher: "Buoni aperti",
  duplicate_document: "Documenti potenzialmente duplicati",
  missing_documentation: "Movimenti senza documento",
  voucher_due_soon: "Buoni in scadenza",
  voucher_overdue: "Buoni scaduti",
};

function describeFinding(
  finding: Finding,
  names: Map<string, { counterpartyName: string; palletTypeCode: string }>,
  formatNumber: (value: number) => string,
): string {
  switch (finding.type) {
    case "unbalanced_movements": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (label?.counterpartyName ?? "—") + " · " + (label?.palletTypeCode ?? "—") + ": " + formatNumber(finding.outstandingQuantity) + " pallet non rientrati";
    }
    case "open_voucher": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (label?.counterpartyName ?? "—") + " · " + (label?.palletTypeCode ?? "—") + ": " + formatNumber(finding.outstandingQuantity) + " pallet residui";
    }
    case "duplicate_document": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (label?.counterpartyName ?? "—") + " · " + (label?.palletTypeCode ?? "—") + ': documento "' + finding.documentNumber + '" ripetuto su ' + finding.movementIds.length + " movimenti";
    }
    case "missing_documentation": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (label?.counterpartyName ?? "—") + " · " + (label?.palletTypeCode ?? "—") + ": movimento senza numero documento";
    }
    case "voucher_due_soon":
      return "Buono in scadenza tra " + finding.daysUntilDue + " giorni (" + finding.dueDate + ")";
    case "voucher_overdue":
      return "Buono scaduto da " + finding.daysOverdue + " giorni (" + finding.dueDate + ")";
  }
}

export default async function ReconciliationPage() {
  const membership = await requireMembership();
  const { formatCurrency, formatNumber } = await getPageContext(membership.organizationId);
  const { balances, findings } = await getReconciliation(membership.organizationId);

  const names = new Map(
    balances.map((item) => [
      item.counterpartyId + "::" + item.palletTypeId,
      { counterpartyName: item.counterpartyName, palletTypeCode: item.palletTypeCode },
    ]),
  );

  const findingsByType = new Map<Finding["type"], Finding[]>();
  for (const finding of findings) {
    const list = findingsByType.get(finding.type) ?? [];
    list.push(finding);
    findingsByType.set(finding.type, list);
  }

  const totalOutstanding = balances.reduce((sum, item) => sum + item.outstandingQuantity, 0);
  const totalValue = balances.reduce((sum, item) => sum + item.outstandingValue, 0);
  const overdue = findings.filter((item) => item.type === "voucher_overdue").length;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Deterministic control</div>
          <h1 className="page-title">Riconciliazione</h1>
          <div className="page-subtitle">
            Confronta OUT, IN e buoni per trasformare anomalie documentali in azioni di recupero.
          </div>
        </div>
        <Link href="/recovery-cases/new" className="btn btn-primary"><Plus size={14} />Nuova pratica</Link>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Posizioni riconciliate</span><span className="metric-icon"><GitCompareArrows size={17} /></span></div>
          <div className="metric-value">{formatNumber(balances.length)}</div>
          <div className="metric-foot">controparte × tipo pallet</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Outstanding</span></div>
          <div className="metric-value">{formatNumber(totalOutstanding)}</div>
          <div className="metric-foot">pallet da spiegare o recuperare</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Valore stimato</span></div>
          <div className="metric-value">{formatCurrency(totalValue)}</div>
          <div className="metric-foot">esposizione teorica</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Anomalie</span><span className="metric-icon danger"><AlertTriangle size={17} /></span></div>
          <div className="metric-value">{formatNumber(findings.length)}</div>
          <div className="metric-foot">{formatNumber(overdue)} buoni scaduti</div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Saldo per controparte / tipo pallet</h2>
            <div className="panel-subtitle">Vista quantitativa che alimenta il decisioning operativo.</div>
          </div>
        </div>
        {balances.length === 0 ? (
          <div className="empty-state">Nessun movimento o buono registrato.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Controparte</th><th>Pallet</th><th>OUT</th><th>IN</th><th>Saldo teorico</th><th>Buoni aperti</th><th>Outstanding</th><th>Valore</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((item) => (
                  <tr key={item.counterpartyId + "::" + item.palletTypeId}>
                    <td><Link className="row-title" href={"/counterparties/" + item.counterpartyId}>{item.counterpartyName}</Link></td>
                    <td>{item.palletTypeCode}</td>
                    <td className="numeric">{formatNumber(item.outboundQuantity)}</td>
                    <td className="numeric">{formatNumber(item.inboundQuantity)}</td>
                    <td className="numeric">{formatNumber(item.theoreticalBalance)}</td>
                    <td className="numeric">{formatNumber(item.voucherOpenQuantity)}</td>
                    <td className="numeric"><strong>{formatNumber(item.outstandingQuantity)}</strong></td>
                    <td className="numeric">{formatCurrency(item.outstandingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="section-grid equal">
        {findings.length === 0 ? (
          <div className="panel" style={{ gridColumn: "1 / -1" }}><div className="empty-state">Nessuna anomalia rilevata.</div></div>
        ) : (
          Array.from(findingsByType.entries()).map(([type, items]) => (
            <section className="panel" key={type}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">{FINDING_LABELS[type]}</h2>
                  <div className="panel-subtitle">{items.length} segnalazioni</div>
                </div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {items.slice(0, 50).map((finding, index) => {
                  const href = createCaseHref(finding);
                  return (
                    <div className="search-result" key={index}>
                      <div className="search-result-title">{describeFinding(finding, names, formatNumber)}</div>
                      {href ? <div style={{ marginTop: 8 }}><Link href={href} className="btn btn-secondary btn-sm">Crea pratica</Link></div> : null}
                    </div>
                  );
                })}
                {items.length > 50 ? <div className="search-result-meta" style={{ padding: 12 }}>+{items.length - 50} altre</div> : null}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
