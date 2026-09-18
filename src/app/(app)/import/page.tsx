import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { listSitesForImportLookup } from "@/lib/data/sites";
import { listImportBatches } from "@/lib/data/import-batches";
import { ImportWizard } from "@/components/import-wizard";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  processing: "In corso",
  completed: "Completato",
  failed: "Fallito",
};

export default async function ImportPage() {
  const membership = await requireMembership();
  const [counterparties, palletTypes, sites, batches] = await Promise.all([
    listCounterparties(membership.organizationId, { includeInactive: true }),
    listPalletTypes(membership.organizationId, { includeInactive: true }),
    listSitesForImportLookup(membership.organizationId),
    listImportBatches(membership.organizationId),
  ]);

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">Import movimenti</div>
      </div>

      <ImportWizard
        counterparties={counterparties.map((c) => ({ id: c.id, code: c.code, legalName: c.legal_name }))}
        palletTypes={palletTypes.map((p) => ({ id: p.id, code: p.code }))}
        sites={sites}
      />

      <h2 style={{ fontSize: 16, marginTop: 32 }}>Import precedenti</h2>
      <div className="card">
        {batches.length === 0 ? (
          <div className="empty-state">Nessun import eseguito finora.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Data</th>
                <th>Stato</th>
                <th>Totali</th>
                <th>Valide</th>
                <th>Non valide</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/import/${b.id}`}>{b.filename}</Link>
                  </td>
                  <td>{formatDate(b.created_at)}</td>
                  <td>{STATUS_LABELS[b.status] ?? b.status}</td>
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
