import Link from "next/link";
import { CalendarDays, CircleDollarSign, PackageCheck, Ticket } from "lucide-react";
import { getPortalSummary } from "@/lib/data/portal";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export default async function PortalOverviewPage() {
  const summary = await getPortalSummary();

  return (
    <div>
      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pallet in sospeso</span><span className="metric-icon"><PackageCheck size={17} /></span></div>
          <div className="metric-value">{formatNumber(summary.outstandingPallets)}</div>
          <div className="metric-foot">ancora da restituire o recuperare</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Esposizione stimata</span><span className="metric-icon danger"><CircleDollarSign size={17} /></span></div>
          <div className="metric-value">{formatCurrency(summary.estimatedExposure)}</div>
          <div className="metric-foot">valore residuo stimato</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Buoni aperti</span><span className="metric-icon"><Ticket size={17} /></span></div>
          <div className="metric-value">{formatNumber(summary.openVouchersCount)}</div>
          <div className="metric-foot">crediti pallet attivi</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Recuperi attivi</span></div>
          <div className="metric-value">{formatNumber(summary.activeRecoveryCasesCount)}</div>
          <div className="metric-foot">pratiche in lavorazione</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Pallet recuperati</span></div>
          <div className="metric-value">{formatNumber(summary.recoveredPallets)}</div>
          <div className="metric-foot">totale storico</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">Valore recuperato</span></div>
          <div className="metric-value">{formatCurrency(summary.recoveredValue)}</div>
          <div className="metric-foot">totale storico</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Prossima scadenza</h2>
            <div className="panel-subtitle">La pratica di recupero più urgente ancora aperta.</div>
          </div>
          <CalendarDays size={16} color="var(--muted)" />
        </div>
        <div className="panel-body">
          {summary.nextDueDate ? (
            <p style={{ margin: 0 }}>{formatDate(summary.nextDueDate)}</p>
          ) : (
            <div className="empty-state">Nessuna scadenza imminente.</div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            Consulta <Link href="/portal/recovery-cases">le pratiche di recupero</Link> per i dettagli completi.
          </p>
        </div>
      </section>
    </div>
  );
}
