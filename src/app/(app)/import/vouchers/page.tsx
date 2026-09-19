import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { listImportBatches } from "@/lib/data/import-batches";
import { listVoucherNumbers } from "@/lib/data/vouchers";
import { listSitesForImportLookup } from "@/lib/data/sites";
import { VoucherImportWizard } from "@/components/voucher-import-wizard";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";

function statusLabels(t: Translator): Record<string, string> {
  return {
    processing: t("bulkImport.vouchers.statusLabels.processing"),
    completed: t("bulkImport.vouchers.statusLabels.completed"),
    failed: t("bulkImport.vouchers.statusLabels.failed"),
  };
}

export default async function VoucherImportPage() {
  const membership = await requireMembership();
  const { t, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const STATUS_LABELS = statusLabels(t);
  const [counterparties, palletTypes, sites, existingVoucherNumbers, batches] = await Promise.all([
    listCounterparties(membership.organizationId, { includeInactive: true }),
    listPalletTypes(membership.organizationId, { includeInactive: true }),
    listSitesForImportLookup(membership.organizationId),
    listVoucherNumbers(membership.organizationId),
    listImportBatches(membership.organizationId),
  ]);

  const voucherBatches = batches.filter((b) => b.source_type === "vouchers");

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("bulkImport.vouchers.eyebrow")}</div>
          <h1 className="page-title">{t("bulkImport.vouchers.title")}</h1>
          <div className="page-subtitle">
            {t("bulkImport.vouchers.subtitle")}
          </div>
        </div>
        <Link href="/vouchers" className="btn btn-secondary">{t("bulkImport.vouchers.backToVouchers")}</Link>
      </div>

      <VoucherImportWizard
        counterparties={counterparties.map((c) => ({ id: c.id, code: c.code, legalName: c.legal_name }))}
        palletTypes={palletTypes.map((p) => ({ id: p.id, code: p.code }))}
        sites={sites}
        existingVoucherNumbers={existingVoucherNumbers}
        labels={{
          invalidFile: t("bulkImport.vouchers.wizard.invalidFile"),
          prerequisiteNotice: t("bulkImport.vouchers.wizard.prerequisiteNotice"),
          csvFileLabel: t("bulkImport.vouchers.wizard.csvFileLabel"),
          expectedColumnsNote: t("bulkImport.vouchers.wizard.expectedColumnsNote"),
          fieldLabels: {
            voucherNumber: t("bulkImport.vouchers.wizard.fieldLabels.voucherNumber"),
            counterparty: t("bulkImport.vouchers.wizard.fieldLabels.counterparty"),
            palletType: t("bulkImport.vouchers.wizard.fieldLabels.palletType"),
            site: t("bulkImport.vouchers.wizard.fieldLabels.site"),
            issueDate: t("bulkImport.vouchers.wizard.fieldLabels.issueDate"),
            recoveryDueDate: t("bulkImport.vouchers.wizard.fieldLabels.recoveryDueDate"),
            quantity: t("bulkImport.vouchers.wizard.fieldLabels.quantity"),
            notes: t("bulkImport.vouchers.wizard.fieldLabels.notes"),
          },
          columnMappingTitle: t("bulkImport.vouchers.wizard.columnMappingTitle"),
          unmapped: t("bulkImport.vouchers.wizard.unmapped"),
          previewTitle: t("bulkImport.vouchers.wizard.previewTitle"),
          missingRequiredTemplate: t("bulkImport.vouchers.wizard.missingRequired"),
          totalRows: t("bulkImport.vouchers.wizard.totalRows"),
          validRows: t("bulkImport.vouchers.wizard.validRows"),
          invalidRows: t("bulkImport.vouchers.wizard.invalidRows"),
          invalidRowsTitle: t("bulkImport.vouchers.wizard.invalidRowsTitle"),
          row: t("bulkImport.vouchers.wizard.row"),
          reason: t("bulkImport.vouchers.wizard.reason"),
          back: t("common.actions.back"),
          confirmImportTemplate: t("bulkImport.vouchers.wizard.confirmImport"),
          importing: t("bulkImport.vouchers.wizard.importing"),
        }}
      />

      <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 12 }}>{t("bulkImport.vouchers.previousImports")}</h2>
      <div className="panel">
        {voucherBatches.length === 0 ? (
          <div className="empty-state">{t("bulkImport.vouchers.noImports")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("bulkImport.vouchers.table.file")}</th>
                  <th>{t("bulkImport.vouchers.table.date")}</th>
                  <th>{t("bulkImport.vouchers.table.status")}</th>
                  <th>{t("bulkImport.vouchers.table.totals")}</th>
                  <th>{t("bulkImport.vouchers.table.valid")}</th>
                  <th>{t("bulkImport.vouchers.table.invalid")}</th>
                </tr>
              </thead>
              <tbody>
                {voucherBatches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/import/${b.id}`} className="row-title">{b.filename}</Link>
                    </td>
                    <td>{formatDate(b.created_at)}</td>
                    <td>{STATUS_LABELS[b.status] ?? b.status}</td>
                    <td className="numeric">{formatNumber(b.rows_total)}</td>
                    <td className="numeric">{formatNumber(b.rows_valid)}</td>
                    <td className="numeric">{formatNumber(b.rows_invalid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
