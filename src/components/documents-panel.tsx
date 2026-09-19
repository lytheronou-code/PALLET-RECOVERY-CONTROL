import { requireMembership } from "@/lib/data/organization";
import { listDocumentsForEntity } from "@/lib/data/documents";
import { DocumentsSection, type DocumentsSectionLabels } from "@/components/documents-section";
import { DOCUMENT_TYPES } from "@/lib/validation/document";
import type { DocumentLinkContext } from "@/lib/actions/documents";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";

// Maps each DB document_type enum value (src/lib/validation/document.ts) to
// its dictionary key -- never a locale-branched literal, per the DB
// enum -> dictionary -> t() pattern used across this app (see
// src/components/status-badge.tsx for the same intent on case/voucher
// status).
const DOCUMENT_TYPE_LABEL_KEYS = {
  ddt: "documents.types.ddt",
  voucher: "documents.types.voucher",
  voucher_scan: "documents.types.voucherScan",
  pickup_proof: "documents.types.pickupProof",
  delivery_proof: "documents.types.deliveryProof",
  pallet_photo: "documents.types.palletPhoto",
  dispute_evidence: "documents.types.disputeEvidence",
  settlement_document: "documents.types.settlementDocument",
  other: "documents.types.other",
} as const satisfies Record<(typeof DOCUMENT_TYPES)[number], Parameters<Translator>[0]>;

// A case/voucher/movement's own evidence set is realistically small (a
// handful to a few dozen files), so a single bounded page (no interactive
// pager) is a deliberate scope decision for this embedded panel, not an
// oversight -- the query is still paginated (.range(), never unbounded).
export async function DocumentsPanel({
  link,
  title,
}: {
  link: DocumentLinkContext;
  title?: string;
}) {
  const membership = await requireMembership();
  const { t, locale, currency, timeZone } = await getPageContext(membership.organizationId);

  const entityLink = link.recoveryCaseId
    ? { recoveryCaseId: link.recoveryCaseId }
    : link.voucherId
      ? { voucherId: link.voucherId }
      : link.movementId
        ? { movementId: link.movementId }
        : { counterpartyId: link.counterpartyId };

  const result = await listDocumentsForEntity(membership.organizationId, entityLink, { page: 1 });

  const documentTypeLabels = Object.fromEntries(
    DOCUMENT_TYPES.map((type) => [type, t(DOCUMENT_TYPE_LABEL_KEYS[type])]),
  ) as DocumentsSectionLabels["documentTypeLabels"];

  const labels: DocumentsSectionLabels = {
    countSingular: t("documents.countSingular"),
    countPlural: t("documents.countPlural"),
    documentType: t("documents.documentType"),
    fileFieldLabel: t("documents.fileFieldLabel"),
    notesOptional: t("documents.notesOptional"),
    uploadButton: t("documents.upload"),
    uploading: t("common.actions.uploading"),
    noDocuments: t("documents.noDocuments"),
    table: {
      type: t("documents.table.type"),
      file: t("documents.table.file"),
      uploadedBy: t("documents.table.uploadedBy"),
      date: t("documents.table.date"),
      visibility: t("documents.table.visibility"),
      status: t("documents.table.status"),
    },
    visibility: {
      client: t("documents.visibility.client"),
      internal: t("documents.visibility.internal"),
    },
    status: {
      active: t("documents.status.active"),
      superseded: t("documents.status.superseded"),
    },
    actions: {
      open: t("documents.actions.open"),
      makeInternal: t("documents.actions.makeInternal"),
      share: t("documents.actions.share"),
      markSuperseded: t("documents.actions.markSuperseded"),
      reactivate: t("documents.actions.reactivate"),
    },
    shownOfTotalTemplate: t("documents.shownOfTotal"),
    documentTypeLabels,
  };

  return (
    <DocumentsSection
      title={title ?? t("documents.evidenceTitle")}
      link={link}
      items={result.items}
      total={result.total}
      locale={locale}
      currency={currency}
      timeZone={timeZone}
      labels={labels}
    />
  );
}
