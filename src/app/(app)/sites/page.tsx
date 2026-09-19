import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listSitesPage } from "@/lib/data/sites";
import { setSiteActiveAction } from "@/lib/actions/sites";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";
import { getPageContext } from "@/i18n/server";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { inactive, q, page: pageParam } = await searchParams;
  const showInactive = inactive === "1";
  const page = parsePage(pageParam);
  const result = await listSitesPage(membership.organizationId, {
    includeInactive: showInactive,
    search: q,
    page,
  });
  const sites = result.items;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("sites.eyebrow")}</div>
          <h1 className="page-title">{t("sites.title")}</h1>
          <div className="page-subtitle">{t("sites.subtitle")}</div>
        </div>
        <Link href="/sites/new" className="btn btn-primary">
          <Plus size={14} />
          {t("sites.new")}
        </Link>
      </div>

      <form method="get" className="search-bar">
        {inactive ? <input type="hidden" name="inactive" value={inactive} /> : null}
        <input type="search" name="q" placeholder={t("sites.searchPlaceholder")} defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">{t("common.actions.search")}</button>
      </form>

      <div className="filter-bar">
        <Link
          href={{ pathname: "/sites", query: { ...(q ? { q } : {}), ...(showInactive ? {} : { inactive: "1" }) } }}
          className={"filter-pill" + (showInactive ? " active" : "")}
        >
          {showInactive ? t("sites.includingInactive") : t("sites.showInactive")}
        </Link>
      </div>

      <div className="panel">
        {sites.length === 0 ? (
          <div className="empty-state">
            <MapPin size={24} style={{ marginBottom: 8 }} />
            <div>{t("sites.empty")}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("sites.table.name")}</th>
                  <th>{t("sites.table.code")}</th>
                  <th>{t("sites.table.counterparty")}</th>
                  <th>{t("sites.table.location")}</th>
                  <th>{t("sites.table.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <Link href={"/sites/" + site.id + "/edit"} className="row-title">
                        {site.name}
                      </Link>
                    </td>
                    <td>{site.code ?? "—"}</td>
                    <td>{site.counterpartyName ?? "—"}</td>
                    <td>{[site.city, site.province].filter(Boolean).join(" · ") || "—"}</td>
                    <td>
                      <span className={"badge " + (site.active ? "badge-closed" : "badge-neutral")}>
                        {site.active ? t("sites.active") : t("sites.inactive")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={"/sites/" + site.id + "/edit"} className="btn btn-secondary btn-sm">
                          {t("common.actions.open")}
                        </Link>
                        <form action={setSiteActiveAction.bind(null, site.id, !site.active)}>
                          <button type="submit" className="btn btn-ghost btn-sm">
                            {site.active ? t("sites.deactivate") : t("sites.reactivate")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        basePath="/sites"
        params={{ inactive, q }}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        t={t}
      />
    </div>
  );
}
