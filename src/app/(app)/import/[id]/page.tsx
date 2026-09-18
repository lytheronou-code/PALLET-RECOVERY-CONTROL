import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getImportBatch } from "@/lib/data/import-batches";
import { formatDate, formatNumber } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  processing: "In corso",
  completed: "Completato",
  failed: "Fallito",
};

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const batch = await getImportBatch(membership.organizationId, id);

  if (!batch) {
    notFound();
  }

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">Import: {batch.filename}</div>
      </div>

      <div className="card">
        <div className="grid kpis" style={{ marginBottom: 8 }}>
          <div>
            <div className="kpi-label">Stato</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {STATUS_LABELS[batch.status] ?? batch.status}
            </div>
          </div>
          <div>
            <div className="kpi-label">Righe totali</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_total)}
            </div>
          </div>
          <div>
            <div className="kpi-label">Valide</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_valid)}
            </div>
          </div>
          <div>
            <div className="kpi-label">Non valide</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>
              {formatNumber(batch.rows_invalid)}
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Avviato il {formatDate(batch.created_at)}
          {batch.completed_at ? ` · completato il ${formatDate(batch.completed_at)}` : ""}
        </p>
      </div>

      <p style={{ marginTop: 16 }}>
        <Link href="/import">← Torna agli import</Link>
      </p>
    </div>
  );
}
