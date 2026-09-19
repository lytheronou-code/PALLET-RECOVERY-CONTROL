import Link from "next/link";
import { Building2, ClipboardList, Search, Ticket } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { globalSearch } from "@/lib/data/search";
import { StatusBadge, VoucherStatusBadge } from "@/components/status-badge";
import { getPageContext } from "@/i18n/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { q = "" } = await searchParams;
  const results = await globalSearch(membership.organizationId, q);
  const total = results.counterparties.length + results.cases.length + results.vouchers.length;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("search.eyebrow")}</div>
          <h1 className="page-title">{t("search.title")}</h1>
          <div className="page-subtitle">
            {q.trim().length < 2
              ? t("search.minChars")
              : total === 0
                ? t("search.noResultsFor", { query: q })
                : t("search.resultsFor", { count: total, query: q })}
          </div>
        </div>
      </div>

      <form className="card" method="get" action="/search" style={{ marginBottom: 16, display: "flex", gap: 10 }}>
        <div className="global-search" style={{ width: "100%" }}>
          <Search size={15} />
          <input name="q" type="search" defaultValue={q} placeholder={t("topbar.searchPlaceholder")} autoFocus />
        </div>
        <button className="btn btn-primary" type="submit">{t("common.actions.search")}</button>
      </form>

      {q.trim().length >= 2 ? (
        <div className="search-sections">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">{t("search.groups.counterparties")}</h2>
                <div className="panel-subtitle">{t("search.resultsCount", { count: results.counterparties.length })}</div>
              </div>
              <Building2 size={16} color="var(--muted)" />
            </div>
            {results.counterparties.length === 0 ? (
              <div className="empty-state">{t("search.emptyCounterparties")}</div>
            ) : (
              results.counterparties.map((item) => (
                <Link className="search-result" key={item.id} href={"/counterparties/" + item.id}>
                  <div className="search-result-title">{item.legalName}</div>
                  <div className="search-result-meta">
                    {[item.code, item.city].filter(Boolean).join(" · ") || t("search.registryEntry")}
                  </div>
                </Link>
              ))
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">{t("search.groups.cases")}</h2>
                <div className="panel-subtitle">{t("search.resultsCount", { count: results.cases.length })}</div>
              </div>
              <ClipboardList size={16} color="var(--muted)" />
            </div>
            {results.cases.length === 0 ? (
              <div className="empty-state">{t("search.emptyCases")}</div>
            ) : (
              results.cases.map((item) => (
                <Link className="search-result" key={item.id} href={"/recovery-cases/" + item.id}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span className="search-result-title">{item.reference}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="search-result-meta">{item.counterpartyName}</div>
                </Link>
              ))
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">{t("search.groups.vouchers")}</h2>
                <div className="panel-subtitle">{t("search.resultsCount", { count: results.vouchers.length })}</div>
              </div>
              <Ticket size={16} color="var(--muted)" />
            </div>
            {results.vouchers.length === 0 ? (
              <div className="empty-state">{t("search.emptyVouchers")}</div>
            ) : (
              results.vouchers.map((item) => (
                <Link className="search-result" key={item.id} href={"/vouchers/" + item.id}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span className="search-result-title">{item.voucherNumber}</span>
                    <VoucherStatusBadge status={item.status} />
                  </div>
                  <div className="search-result-meta">{item.counterpartyName}</div>
                </Link>
              ))
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
