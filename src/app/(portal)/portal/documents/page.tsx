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
  const { t, locale, currency, timeZone } = await getPageContext(context?.organizationId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{t("clientPortal.documents.title")}</h2>
          <div className="panel-subtitle">{t("clientPortal.documents.subtitle")}</div>
        </div>
      </div>
      {result.items.length === 0 ? (
        <div className="empty-state">{t("clientPortal.documents.empty")}</div>
      ) : (
        <PortalDocumentsTable items={result.items} locale={locale} currency={currency} timeZone={timeZone} />
      )}
      <Pagination basePath="/portal/documents" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} t={t} />
    </section>
  );
}
