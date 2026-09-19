import Link from "next/link";
import { Building2, ClipboardList, Search, Ticket } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { globalSearch } from "@/lib/data/search";
import { StatusBadge, VoucherStatusBadge } from "@/components/status-badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const membership = await requireMembership();
  const { q = "" } = await searchParams;
  const results = await globalSearch(membership.organizationId, q);
  const total = results.counterparties.length + results.cases.length + results.vouchers.length;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Global search</div>
          <h1 className="page-title">Ricerca</h1>
          <div className="page-subtitle">
            {q.trim().length < 2
              ? "Inserisci almeno due caratteri per cercare."
              : total === 0
                ? "Nessun risultato per “" + q + "”."
                : total + " risultati per “" + q + "”."}
          </div>
        </div>
      </div>

      <form className="card" method="get" action="/search" style={{ marginBottom: 16, display: "flex", gap: 10 }}>
        <div className="global-search" style={{ width: "100%" }}>
          <Search size={15} />
          <input name="q" type="search" defaultValue={q} placeholder="Pratica, controparte o buono…" autoFocus />
        </div>
        <button className="btn btn-primary" type="submit">Cerca</button>
      </form>

      {q.trim().length >= 2 ? (
        <div className="search-sections">
          <section className="panel">
            <div className="panel-header">
              <div><h2 className="panel-title">Controparti</h2><div className="panel-subtitle">{results.counterparties.length} risultati</div></div>
              <Building2 size={16} color="var(--muted)" />
            </div>
            {results.counterparties.length === 0 ? <div className="empty-state">Nessuna controparte.</div> :
              results.counterparties.map((item) => (
                <Link className="search-result" key={item.id} href={"/counterparties/" + item.id}>
                  <div className="search-result-title">{item.legalName}</div>
                  <div className="search-result-meta">{[item.code, item.city].filter(Boolean).join(" · ") || "Anagrafica"}</div>
                </Link>
              ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div><h2 className="panel-title">Pratiche</h2><div className="panel-subtitle">{results.cases.length} risultati</div></div>
              <ClipboardList size={16} color="var(--muted)" />
            </div>
            {results.cases.length === 0 ? <div className="empty-state">Nessuna pratica.</div> :
              results.cases.map((item) => (
                <Link className="search-result" key={item.id} href={"/recovery-cases/" + item.id}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span className="search-result-title">{item.reference}</span>
                    <StatusBadge status={item.status} t={t} />
                  </div>
                  <div className="search-result-meta">{item.counterpartyName}</div>
                </Link>
              ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div><h2 className="panel-title">Buoni</h2><div className="panel-subtitle">{results.vouchers.length} risultati</div></div>
              <Ticket size={16} color="var(--muted)" />
            </div>
            {results.vouchers.length === 0 ? <div className="empty-state">Nessun buono.</div> :
              results.vouchers.map((item) => (
                <Link className="search-result" key={item.id} href={"/vouchers/" + item.id}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span className="search-result-title">{item.voucherNumber}</span>
                    <VoucherStatusBadge status={item.status} t={t} />
                  </div>
                  <div className="search-result-meta">{item.counterpartyName}</div>
                </Link>
              ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}
