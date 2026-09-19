import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getMovement } from "@/lib/data/movements";
import { getPageContext } from "@/i18n/server";
import { CorrectMovementForm } from "@/components/correct-movement-form";
import { DocumentsPanel } from "@/components/documents-panel";

export default async function CorrectMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const movement = await getMovement(membership.organizationId, id);

  if (!movement) notFound();

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Movement ledger</div>
          <h1 className="page-title">Correggi movimento</h1>
          <div className="page-subtitle">
            Il ledger è immutabile: la correzione registra uno storno e, se necessario, un movimento sostitutivo.
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Movimento originale</h2>
          </div>
        </div>
        <div className="panel-body">
          <dl className="definition-list">
            <dt>Data</dt><dd>{formatDate(movement.movementDate)}</dd>
            <dt>Direzione</dt><dd>{movement.direction === "outbound" ? "OUT" : "IN"}</dd>
            <dt>Controparte</dt><dd>{movement.counterpartyName}</dd>
            <dt>Tipo pallet</dt><dd>{movement.palletTypeCode}</dd>
            <dt>Quantità</dt><dd>{formatNumber(movement.quantity)}</dd>
            <dt>Documento</dt><dd>{movement.documentNumber ?? "—"}</dd>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Correzione</h2>
          </div>
        </div>
        <div className="panel-body">
          <CorrectMovementForm movement={movement} />
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <DocumentsPanel
          link={{
            counterpartyId: movement.counterpartyId,
            entity: "movement",
            entityId: movement.id,
            movementId: movement.id,
          }}
        />
      </div>
    </div>
  );
}
