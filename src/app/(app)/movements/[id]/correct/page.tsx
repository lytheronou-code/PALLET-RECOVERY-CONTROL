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
  const { t, formatDate, formatNumber } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const movement = await getMovement(membership.organizationId, id);

  if (!movement) notFound();

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("movements.correctPage.eyebrow")}</div>
          <h1 className="page-title">{t("movements.correctPage.title")}</h1>
          <div className="page-subtitle">{t("movements.correctPage.subtitle")}</div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("movements.correctPage.originalMovement")}</h2>
          </div>
        </div>
        <div className="panel-body">
          <dl className="definition-list">
            <dt>{t("movements.correctPage.fields.date")}</dt><dd>{formatDate(movement.movementDate)}</dd>
            <dt>{t("movements.correctPage.fields.direction")}</dt><dd>{movement.direction === "outbound" ? "OUT" : "IN"}</dd>
            <dt>{t("movements.correctPage.fields.counterparty")}</dt><dd>{movement.counterpartyName}</dd>
            <dt>{t("movements.correctPage.fields.palletType")}</dt><dd>{movement.palletTypeCode}</dd>
            <dt>{t("movements.correctPage.fields.quantity")}</dt><dd>{formatNumber(movement.quantity)}</dd>
            <dt>{t("movements.correctPage.fields.document")}</dt><dd>{movement.documentNumber ?? "—"}</dd>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("movements.correctPage.correction")}</h2>
          </div>
        </div>
        <div className="panel-body">
          <CorrectMovementForm
            movement={movement}
            labels={{
              reason: t("movements.correctForm.reasonLabel"),
              reasonPlaceholder: t("movements.correctForm.reasonPlaceholder"),
              reversalOnly: t("movements.correctForm.reversalOnlyLabel"),
              replacementIntro: t("movements.correctForm.replacementIntro"),
              date: t("movements.correctForm.fields.date"),
              direction: t("movements.correctForm.fields.direction"),
              outbound: t("movements.correctForm.fields.outbound"),
              inbound: t("movements.correctForm.fields.inbound"),
              quantity: t("movements.correctForm.fields.quantity"),
              documentType: t("movements.correctForm.fields.documentType"),
              documentNumber: t("movements.correctForm.fields.documentNumber"),
              saving: t("common.actions.saving"),
              reverseButton: t("movements.correctForm.reverseButton"),
              correctButton: t("movements.correctForm.correctButton"),
            }}
          />
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
