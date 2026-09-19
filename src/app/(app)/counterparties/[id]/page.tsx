import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getCounterpartyOverview } from "@/lib/data/counterparties";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge, VoucherStatusBadge } from "@/components/status-badge";
import { DocumentsPanel } from "@/components/documents-panel";
import { ClientPortalAccessPanel } from "@/components/client-portal-access-panel";
import { listClientPortalMemberships } from "@/lib/data/client-portal-admin";

const TYPE_LABELS: Record<string, string> = {
  customer: "Cliente",
  debtor: "Debitore",
  retailer: "Punto vendita",
  carrier: "Trasportatore",
  supplier: "Fornitore",
  other: "Altro",
};

export default async function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const overview = await getCounterpartyOverview(membership.organizationId, id);

  if (!overview) notFound();

  const portalMembers = await listClientPortalMemberships(membership.organizationId, id);

  const cp = overview.counterparty;
  const address = [cp.address_line, cp.postal_code, cp.city, cp.province].filter(Boolean).join(", ");

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{TYPE_LABELS[cp.counterparty_type] ?? cp.counterparty_type}</div>
          <h1 className="page-title">{cp.legal_name}</h1>
          <div className="page-subtitle">
            Portfolio operativo, esposizione e storico pallet della controparte.
          </div>
        </div>
        <div className="header-actions">
          <Link href={"/counterparties/" + cp.id + "/edit"} className="btn btn-secondary">
            <Pencil size={14} />
            Modifica
          </Link>
          <Link
            href={"/recovery-cases/new?counterpartyId=" + cp.id}
            className="btn btn-primary"
          >
            Nuova pratica
          </Link>
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Esposizione aperta</span></div>
          <div className="metric-value">{formatCurrency(overview.openExposure)}</div>
          <div className="metric-foot">valore ancora da recuperare</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pratiche operative</span></div>
          <div className="metric-value">{formatNumber(overview.openCases)}</div>
          <div className="metric-foot">aperte o in lavorazione</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Buoni attivi</span></div>
          <div className="metric-value">{formatNumber(overview.openVouchers)}</div>
          <div className="metric-foot">aperti, parziali o contestati</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pallet recuperati</span></div>
          <div className="metric-value">{formatNumber(overview.recoveredPallets)}</div>
          <div className="metric-foot">storico delle pratiche</div>
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pratiche recenti</h2>
              <div className="panel-subtitle">Ultime attività di recovery collegate alla controparte.</div>
            </div>
          </div>
          {overview.cases.length === 0 ? (
            <div className="empty-state">Nessuna pratica registrata.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pratica</th>
                    <th>Pallet</th>
                    <th>Residuo</th>
                    <th>Valore</th>
                    <th>Scadenza</th>
                    <th>Priorità</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.cases.map((item) => (
                    <tr key={item.id}>
                      <td><Link className="row-title" href={"/recovery-cases/" + item.id}>{item.reference}</Link></td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(item.outstandingQuantity)}</td>
                      <td className="numeric">{formatCurrency(item.outstandingValue)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} /></td>
                      <td><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Anagrafica</h2>
              <div className="panel-subtitle">{cp.code ?? "Nessun codice interno"}</div>
            </div>
            <Building2 size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>P. IVA</dt><dd>{cp.vat_number ?? "—"}</dd>
              <dt>Stato</dt><dd>{cp.active ? "Attiva" : "Non attiva"}</dd>
              <dt><MapPin size={13} /></dt><dd>{address || "—"}</dd>
              <dt><Mail size={13} /></dt><dd>{cp.email ?? "—"}</dd>
              <dt><Phone size={13} /></dt><dd>{cp.phone ?? "—"}</dd>
            </dl>
          </div>
        </aside>
      </div>

      <div className="section-grid equal" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Siti</h2>
              <div className="panel-subtitle">Depositi e punti di consegna di questa controparte.</div>
            </div>
            <Link href={"/sites/new?counterpartyId=" + cp.id} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              Nuovo sito
            </Link>
          </div>
          {overview.sites.length === 0 ? (
            <div className="empty-state">Nessun sito registrato per questa controparte.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Nome</th><th>Città</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  {overview.sites.map((site) => (
                    <tr key={site.id}>
                      <td><Link className="row-title" href={"/sites/" + site.id + "/edit"}>{site.name}</Link></td>
                      <td>{site.city ?? "—"}</td>
                      <td>
                        <span className={"badge " + (site.active ? "badge-closed" : "badge-neutral")}>
                          {site.active ? "Attivo" : "Non attivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Buoni recenti</h2>
              <div className="panel-subtitle">Crediti pallet e scadenze.</div>
            </div>
            <Link href="/vouchers" className="panel-link">Apri buoni</Link>
          </div>
          {overview.vouchers.length === 0 ? (
            <div className="empty-state">Nessun buono registrato.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Buono</th><th>Pallet</th><th>Residuo</th><th>Scadenza</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  {overview.vouchers.map((item) => (
                    <tr key={item.id}>
                      <td className="row-title">{item.voucherNumber}</td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(Math.max(0, item.quantity - item.recoveredQuantity))}</td>
                      <td>{formatDate(item.recoveryDueDate)}</td>
                      <td><VoucherStatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Movimenti recenti</h2>
              <div className="panel-subtitle">Ultimi flussi pallet registrati.</div>
            </div>
          </div>
          {overview.movements.length === 0 ? (
            <div className="empty-state">Nessun movimento registrato.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Data</th><th>Flusso</th><th>Pallet</th><th>Quantità</th><th>Documento</th></tr>
                </thead>
                <tbody>
                  {overview.movements.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.movementDate)}</td>
                      <td><span className={"badge " + (item.direction === "outbound" ? "badge-open" : "badge-closed")}>{item.direction === "outbound" ? "OUT" : "IN"}</span></td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(item.quantity)}</td>
                      <td>{item.documentNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <DocumentsPanel
          link={{
            counterpartyId: cp.id,
            entity: "counterparty",
            entityId: cp.id,
          }}
          title="Documenti e prove della controparte"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <ClientPortalAccessPanel counterpartyId={cp.id} members={portalMembers} isAdmin={membership.role === "admin"} />
      </div>
    </div>
  );
}
