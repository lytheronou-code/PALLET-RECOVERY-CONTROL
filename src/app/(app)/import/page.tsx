import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { listSitesForImportLookup } from "@/lib/data/sites";
import { listImportBatches } from "@/lib/data/import-batches";
import { ImportWizard } from "@/components/import-wizard";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";

const STATUS_LABEL_KEYS = {
  processing: "bulkImport.movements.status.processing",
  completed: "bulkImport.movements.status.completed",
  failed: "bulkImport.movements.status.failed",
} as const satisfies Record<string, Parameters<Translator>[0]>;

function statusLabel(status: string, t: Translator): string {
  const key = STATUS_LABEL_KEYS[status as keyof typeof STATUS_LABEL_KEYS];
  return key ? t(key) : status;
}

export default async function ImportPage() {
  const membership = await requireMembership();
  const { t, locale, formatDate } = await getPageContext(membership.organizationId);
  const [counterparties, palletTypes, sites, batches] = await Promise.all([
    listCounterparties(membership.organizationId, { includeInactive: true }),
    listPalletTypes(membership.organizationId, { includeInactive: true }),
    listSitesForImportLookup(membership.organizationId),
    listImportBatches(membership.organizationId),
  ]);

  const labels = {
    fileEmptyError: t("bulkImport.movements.fileEmptyError"),
    prerequisiteMissing: t("bulkImport.movements.prerequisiteMissing"),
    csvFileLabel: t("bulkImport.movements.csvFileLabel"),
    expectedColumns: t("bulkImport.movements.expectedColumns"),
    step1Title: t("bulkImport.movements.step1Title"),
    unmapped: t("bulkImport.movements.unmapped"),
    step2Title: t("bulkImport.movements.step2Title"),
    missingRequiredFieldsTemplate: t("bulkImport.movements.missingRequiredFields"),
    totalRows: t("bulkImport.movements.table.totalRows"),
    validRows: t("bulkImport.movements.table.validRows"),
    invalidRows: t("bulkImport.movements.table.invalidRows"),
    invalidRowsTitle: t("bulkImport.movements.invalidRowsTitle"),
    rowNumber: t("bulkImport.movements.rowNumber"),
    reason: t("bulkImport.movements.reason"),
    back: t("common.actions.back"),
    importing: t("bulkImport.movements.importing"),
    confirmImportTemplate: t("bulkImport.movements.confirmImport"),
    fields: {
      movementDate: t("bulkImport.movements.fields.movementDate"),
      counterparty: t("bulkImport.movements.fields.counterparty"),
      palletType: t("bulkImport.movements.fields.palletType"),
      site: t("bulkImport.movements.fields.site"),
      direction: t("bulkImport.movements.fields.direction"),
      quantity: t("bulkImport.movements.fields.quantity"),
      documentType: t("bulkImport.movements.fields.documentType"),
      documentNumber: t("bulkImport.movements.fields.documentNumber"),
      voucherNumber: t("bulkImport.movements.fields.voucherNumber"),
      notes: t("bulkImport.movements.fields.notes"),
    },
  };

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">{t("bulkImport.movements.pageTitle")}</div>
      </div>

      <ImportWizard
        counterparties={counterparties.map((c) => ({ id: c.id, code: c.code, legalName: c.legal_name }))}
        palletTypes={palletTypes.map((p) => ({ id: p.id, code: p.code }))}
        sites={sites}
        labels={labels}
        locale={locale}
      />

      <h2 style={{ fontSize: 16, marginTop: 32 }}>{t("bulkImport.movements.previousImports")}</h2>
      <div className="card">
        {batches.length === 0 ? (
          <div className="empty-state">{t("bulkImport.movements.noImportsYet")}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("bulkImport.movements.table.file")}</th>
                <th>{t("bulkImport.movements.table.date")}</th>
                <th>{t("bulkImport.movements.table.status")}</th>
                <th>{t("bulkImport.movements.table.totalRows")}</th>
                <th>{t("bulkImport.movements.table.validRows")}</th>
                <th>{t("bulkImport.movements.table.invalidRows")}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/import/${b.id}`}>{b.filename}</Link>
                  </td>
                  <td>{formatDate(b.created_at)}</td>
                  <td>{statusLabel(b.status, t)}</td>
                  <td>{b.rows_total}</td>
                  <td>{b.rows_valid}</td>
                  <td>{b.rows_invalid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
