import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listCounterpartiesPage } from "@/lib/data/counterparties";
import { setCounterpartyActiveAction } from "@/lib/actions/counterparties";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";
import { getPageContext } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";

// DB enum -> translation-key dictionary (never an if/else per locale);
// adding a locale only means a dictionary entry, never a code change here.
const TYPE_LABEL_KEYS = {
  customer: "counterparties.types.customer",
  debtor: "counterparties.types.debtor",
  retailer: "counterparties.types.retailer",
  carrier: "counterparties.types.carrier",
  supplier: "counterparties.types.supplier",
  other: "counterparties.types.other",
} as const satisfies Record<string, TranslationKey>;

export default async function CounterpartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { inactive, q, page: pageParam } = await searchParams;
  const showInactive = inactive === "1";
  const page = parsePage(pageParam);
  const result = await listCounterpartiesPage(membership.organizationId, {
    includeInactive: showInactive,
    search: q,
    page,
  });
  const counterparties = result.items;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("counterparties.eyebrow")}</div>
          <h1 className="page-title">{t("counterparties.title")}</h1>
          <div className="page-subtitle">{t("counterparties.subtitle")}</div>
        </div>
        <Link href="/counterparties/new" className="btn btn-primary">
          <Plus size={14} />
          {t("counterparties.new")}
        </Link>
      </div>

      <form method="get" className="search-bar">
        {inactive ? <input type="hidden" name="inactive" value={inactive} /> : null}
        <input type="search" name="q" placeholder={t("counterparties.searchPlaceholder")} defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">{t("common.actions.search")}</button>
      </form>

      <div className="filter-bar">
        <Link
          href={{ pathname: "/counterparties", query: { ...(q ? { q } : {}), ...(showInactive ? {} : { inactive: "1" }) } }}
          className={"filter-pill" + (showInactive ? " active" : "")}
        >
          {showInactive ? t("counterparties.includingInactive") : t("counterparties.showInactive")}
        </Link>
      </div>

      <div className="panel">
        {counterparties.length === 0 ? (
          <div className="empty-state">
            <Building2 size={24} style={{ marginBottom: 8 }} />
            <div>{t("counterparties.empty")}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("counterparties.table.legalName")}</th>
                  <th>{t("counterparties.table.code")}</th>
                  <th>{t("counterparties.table.type")}</th>
                  <th>{t("counterparties.table.location")}</th>
                  <th>{t("counterparties.table.contact")}</th>
                  <th>{t("counterparties.table.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => {
                  const typeKey = TYPE_LABEL_KEYS[cp.counterparty_type as keyof typeof TYPE_LABEL_KEYS];
                  return (
                    <tr key={cp.id}>
                      <td>
                        <Link href={"/counterparties/" + cp.id}>
                          <div className="row-title">{cp.legal_name}</div>
                          <div className="row-subtitle">{cp.vat_number ?? t("counterparties.vatNotProvided")}</div>
                        </Link>
                      </td>
                      <td>{cp.code ?? "—"}</td>
                      <td>{typeKey ? t(typeKey) : cp.counterparty_type}</td>
                      <td>{[cp.city, cp.province].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{cp.email ?? cp.phone ?? "—"}</td>
                      <td>
                        <span className={"badge " + (cp.active ? "badge-closed" : "badge-neutral")}>
                          {cp.active ? t("counterparties.active") : t("counterparties.inactive")}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Link href={"/counterparties/" + cp.id} className="btn btn-secondary btn-sm">
                            {t("common.actions.open")}
                          </Link>
                          <form action={setCounterpartyActiveAction.bind(null, cp.id, !cp.active)}>
                            <button type="submit" className="btn btn-ghost btn-sm">
                              {cp.active ? t("counterparties.deactivate") : t("counterparties.reactivate")}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        basePath="/counterparties"
        params={{ inactive, q }}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        t={t}
      />
    </div>
  );
}
