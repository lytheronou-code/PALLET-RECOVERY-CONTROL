import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { listSitesPage } from "@/lib/data/sites";
import { setSiteActiveAction } from "@/lib/actions/sites";
import { parsePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string; q?: string; page?: string }>;
}) {
  const membership = await requireMembership();
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
          <div className="eyebrow">Master data</div>
          <h1 className="page-title">Siti operativi</h1>
          <div className="page-subtitle">
            Depositi, stabilimenti e punti di consegna dove l&apos;esposizione pallet è fisicamente localizzata.
          </div>
        </div>
        <Link href="/sites/new" className="btn btn-primary">
          <Plus size={14} />
          Nuovo sito
        </Link>
      </div>

      <form method="get" className="search-bar">
        {inactive ? <input type="hidden" name="inactive" value={inactive} /> : null}
        <input type="search" name="q" placeholder="Cerca per nome, codice o città…" defaultValue={q ?? ""} />
        <button type="submit" className="btn btn-secondary btn-sm">Cerca</button>
      </form>

      <div className="filter-bar">
        <Link
          href={{ pathname: "/sites", query: { ...(q ? { q } : {}), ...(showInactive ? {} : { inactive: "1" }) } }}
          className={"filter-pill" + (showInactive ? " active" : "")}
        >
          {showInactive ? "Incluse non attive" : "Mostra non attive"}
        </Link>
      </div>

      <div className="panel">
        {sites.length === 0 ? (
          <div className="empty-state">
            <MapPin size={24} style={{ marginBottom: 8 }} />
            <div>Nessun sito registrato. Aggiungi i depositi e i punti di consegna coinvolti nei flussi pallet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Codice</th>
                  <th>Controparte</th>
                  <th>Località</th>
                  <th>Stato</th>
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
                        {site.active ? "Attivo" : "Non attivo"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={"/sites/" + site.id + "/edit"} className="btn btn-secondary btn-sm">Apri</Link>
                        <form action={setSiteActiveAction.bind(null, site.id, !site.active)}>
                          <button type="submit" className="btn btn-ghost btn-sm">
                            {site.active ? "Disattiva" : "Riattiva"}
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
      />
    </div>
  );
}
