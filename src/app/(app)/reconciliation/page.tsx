import Link from "next/link";
import { AlertTriangle, GitCompareArrows, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getReconciliation } from "@/lib/data/reconciliation";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
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

const FINDING_LABEL_KEYS = {
  unbalanced_movements: "reconciliation.findings.unbalancedMovements",
  open_voucher: "reconciliation.findings.openVoucher",
  duplicate_document: "reconciliation.findings.duplicateDocument",
  missing_documentation: "reconciliation.findings.missingDocumentation",
  voucher_due_soon: "reconciliation.findings.voucherDueSoon",
  voucher_overdue: "reconciliation.findings.voucherOverdue",
} as const satisfies Record<Finding["type"], Parameters<Translator>[0]>;

function describeFinding(
  finding: Finding,
  names: Map<string, { counterpartyName: string; palletTypeCode: string }>,
  t: Translator,
  formatNumber: (value: number) => string,
): string {
  switch (finding.type) {
    case "unbalanced_movements": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (
        (label?.counterpartyName ?? "—") +
        " · " +
        (label?.palletTypeCode ?? "—") +
        ": " +
        t("reconciliation.describe.unbalancedMovementsOutstanding", {
          quantity: formatNumber(finding.outstandingQuantity),
        })
      );
    }
    case "open_voucher": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (
        (label?.counterpartyName ?? "—") +
        " · " +
        (label?.palletTypeCode ?? "—") +
        ": " +
        t("reconciliation.describe.openVoucherOutstanding", {
          quantity: formatNumber(finding.outstandingQuantity),
        })
      );
    }
    case "duplicate_document": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (
        (label?.counterpartyName ?? "—") +
        " · " +
        (label?.palletTypeCode ?? "—") +
        ": " +
        t("reconciliation.describe.duplicateDocument", {
          document: finding.documentNumber,
          count: finding.movementIds.length,
        })
      );
    }
    case "missing_documentation": {
      const label = names.get(finding.counterpartyId + "::" + finding.palletTypeId);
      return (
        (label?.counterpartyName ?? "—") +
        " · " +
        (label?.palletTypeCode ?? "—") +
        ": " +
        t("reconciliation.describe.missingDocumentation")
      );
    }
    case "voucher_due_soon":
      return t("reconciliation.describe.voucherDueSoon", {
        days: finding.daysUntilDue,
        date: finding.dueDate,
      });
    case "voucher_overdue":
      return t("reconciliation.describe.voucherOverdue", {
        days: finding.daysOverdue,
        date: finding.dueDate,
      });
  }
}

export default async function ReconciliationPage() {
  const membership = await requireMembership();
  const { t, formatCurrency, formatNumber } = await getPageContext(membership.organizationId);
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
          <div className="eyebrow">{t("reconciliation.eyebrow")}</div>
          <h1 className="page-title">{t("reconciliation.title")}</h1>
          <div className="page-subtitle">{t("reconciliation.subtitle")}</div>
        </div>
        <Link href="/recovery-cases/new" className="btn btn-primary">
          <Plus size={14} />
          {t("recoveryCases.new")}
        </Link>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("reconciliation.metrics.reconciledPositions")}</span>
            <span className="metric-icon"><GitCompareArrows size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(balances.length)}</div>
          <div className="metric-foot">{t("reconciliation.metrics.reconciledPositionsFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("reconciliation.metrics.outstanding")}</span></div>
          <div className="metric-value">{formatNumber(totalOutstanding)}</div>
          <div className="metric-foot">{t("reconciliation.metrics.outstandingFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("reconciliation.metrics.estimatedValue")}</span></div>
          <div className="metric-value">{formatCurrency(totalValue)}</div>
          <div className="metric-foot">{t("reconciliation.metrics.estimatedValueFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("reconciliation.metrics.anomalies")}</span>
            <span className="metric-icon danger"><AlertTriangle size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(findings.length)}</div>
          <div className="metric-foot">
            {t("reconciliation.metrics.anomaliesFoot", { count: formatNumber(overdue) })}
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("reconciliation.balanceTable.title")}</h2>
            <div className="panel-subtitle">{t("reconciliation.balanceTable.subtitle")}</div>
          </div>
        </div>
        {balances.length === 0 ? (
          <div className="empty-state">{t("reconciliation.emptyBalances")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("reconciliation.balanceTable.counterparty")}</th>
                  <th>{t("reconciliation.balanceTable.palletType")}</th>
                  <th>{t("reconciliation.balanceTable.out")}</th>
                  <th>{t("reconciliation.balanceTable.in")}</th>
                  <th>{t("reconciliation.balanceTable.theoreticalBalance")}</th>
                  <th>{t("reconciliation.balanceTable.openVouchers")}</th>
                  <th>{t("reconciliation.balanceTable.outstanding")}</th>
                  <th>{t("reconciliation.balanceTable.value")}</th>
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
          <div className="panel" style={{ gridColumn: "1 / -1" }}><div className="empty-state">{t("reconciliation.emptyFindings")}</div></div>
        ) : (
          Array.from(findingsByType.entries()).map(([type, items]) => (
            <section className="panel" key={type}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">{t(FINDING_LABEL_KEYS[type])}</h2>
                  <div className="panel-subtitle">{t("reconciliation.findingsCount", { count: items.length })}</div>
                </div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {items.slice(0, 50).map((finding, index) => {
                  const href = createCaseHref(finding);
                  return (
                    <div className="search-result" key={index}>
                      <div className="search-result-title">{describeFinding(finding, names, t, formatNumber)}</div>
                      {href ? (
                        <div style={{ marginTop: 8 }}>
                          <Link href={href} className="btn btn-secondary btn-sm">
                            {t("reconciliation.createCase")}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {items.length > 50 ? (
                  <div className="search-result-meta" style={{ padding: 12 }}>
                    {t("reconciliation.moreFindings", { count: items.length - 50 })}
                  </div>
                ) : null}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
