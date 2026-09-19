import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getImportBatch } from "@/lib/data/import-batches";
import { getPageContext } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";

// DB enum (import_batches.status) -> translation-key dictionary, never an
// if/else per locale -- same pattern as status-badge.tsx. Reuses
// bulkImport.movements.status.* (identical text to bulkImport.vouchers.
// statusLabels.*) since this page renders both movement and voucher
// batches.
const STATUS_LABEL_KEYS = {
  processing: "bulkImport.movements.status.processing",
  completed: "bulkImport.movements.status.completed",
  failed: "bulkImport.movements.status.failed",
} as const satisfies Record<string, TranslationKey>;

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const batch = await getImportBatch(membership.organizationId, id);

  if (!batch) {
    notFound();
  }

  const statusKey = STATUS_LABEL_KEYS[batch.status as keyof typeof STATUS_LABEL_KEYS];

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">{t("bulkImport.movements.pageTitle")}: {batch.filename}</div>
      </div>

      <div className="card">
        <div className="grid kpis" style={{ marginBottom: 8 }}>
          <div>
            <div className="kpi-label">{t("bulkImport.movements.table.status")}</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {statusKey ? t(statusKey) : batch.status}
            </div>
          </div>
          <div>
            <div className="kpi-label">{t("bulkImport.movements.table.totalRows")}</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_total)}
            </div>
          </div>
          <div>
            <div className="kpi-label">{t("bulkImport.movements.table.validRows")}</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_valid)}
            </div>
          </div>
          <div>
            <div className="kpi-label">{t("bulkImport.movements.table.invalidRows")}</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_invalid)}
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("import.batch.startedOn", { date: formatDate(batch.created_at) })}
          {batch.completed_at ? ` · ${t("import.batch.completedOn", { date: formatDate(batch.completed_at) })}` : ""}
        </p>
      </div>

      <p style={{ marginTop: 16 }}>
        <Link href={batch.source_type === "vouchers" ? "/import/vouchers" : "/import"}>
          {t("import.batch.backToImports")}
        </Link>
      </p>
    </div>
  );
}
