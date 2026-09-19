import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { listImportBatches } from "@/lib/data/import-batches";
import { listVoucherNumbers } from "@/lib/data/vouchers";
import { listSitesForImportLookup } from "@/lib/data/sites";
import { VoucherImportWizard } from "@/components/voucher-import-wizard";
import { getPageContext } from "@/i18n/server";

const STATUS_LABELS: Record<string, string> = {
  processing: "In corso",
  completed: "Completato",
  failed: "Fallito",
};

export default async function VoucherImportPage() {
  const membership = await requireMembership();
  const { formatDate, formatNumber } = await getPageContext(membership.organizationId);
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
          <div className="eyebrow">Pallet credits</div>
          <h1 className="page-title">Import buoni</h1>
          <div className="page-subtitle">
            Carica un file CSV, mappa le colonne e verifica l&apos;anteprima prima di confermare: nessuna riga viene
            importata silenziosamente.
          </div>
        </div>
        <Link href="/vouchers" className="btn btn-secondary">Torna ai buoni</Link>
      </div>

      <VoucherImportWizard
        counterparties={counterparties.map((c) => ({ id: c.id, code: c.code, legalName: c.legal_name }))}
        palletTypes={palletTypes.map((p) => ({ id: p.id, code: p.code }))}
        sites={sites}
        existingVoucherNumbers={existingVoucherNumbers}
      />

      <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 12 }}>Import precedenti</h2>
      <div className="panel">
        {voucherBatches.length === 0 ? (
          <div className="empty-state">Nessun import di buoni eseguito finora.</div>
        ) : (
          <div className="table-wrap">
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
