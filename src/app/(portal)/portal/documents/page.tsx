import { getPortalContext, listPortalDocuments } from "@/lib/data/portal";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";
import { PortalDocumentsTable } from "@/components/portal-documents-table";
import { getPageContext } from "@/i18n/server";

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [context, result] = await Promise.all([getPortalContext(), listPortalDocuments(page)]);
  const { locale, currency, timeZone } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Documenti e prove</h2>
          <div className="panel-subtitle">Documenti condivisi dal team di recupero.</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">Nessun documento condiviso al momento.</div>
      ) : (
        <PortalDocumentsTable items={result.items} locale={locale} currency={currency} timeZone={timeZone} />
      )}
      <Pagination basePath="/portal/documents" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} />
    </section>
  );
}
