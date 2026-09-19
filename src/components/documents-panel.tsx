import { requireMembership } from "@/lib/data/organization";
import { listDocumentsForEntity } from "@/lib/data/documents";
import { DocumentsSection } from "@/components/documents-section";
import type { DocumentLinkContext } from "@/lib/actions/documents";
import { getPageContext } from "@/i18n/server";

// A case/voucher/movement's own evidence set is realistically small (a
// handful to a few dozen files), so a single bounded page (no interactive
// pager) is a deliberate scope decision for this embedded panel, not an
// oversight -- the query is still paginated (.range(), never unbounded).
export async function DocumentsPanel({
  link,
  title = "Documenti e prove",
}: {
  link: DocumentLinkContext;
  title?: string;
}) {
  const membership = await requireMembership();
  const { locale, currency, timeZone } = await getPageContext(membership.organizationId);

  const entityLink = link.recoveryCaseId
    ? { recoveryCaseId: link.recoveryCaseId }
    : link.voucherId
      ? { voucherId: link.voucherId }
      : link.movementId
        ? { movementId: link.movementId }
        : { counterpartyId: link.counterpartyId };

  const result = await listDocumentsForEntity(membership.organizationId, entityLink, { page: 1 });

  return (
    <DocumentsSection
      title={title}
      link={link}
      items={result.items}
      total={result.total}
      locale={locale}
      currency={currency}
      timeZone={timeZone}
    />
  );
}
