import { LogOut } from "lucide-react";
import { requirePortalContext } from "@/lib/data/portal";
import { signOutAction } from "@/lib/actions/auth";
import { PortalNav } from "@/components/portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePortalContext();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 48px" }}>
      <div className="header" style={{ marginBottom: 8 }}>
        <div className="page-heading">
          <div className="eyebrow">Portale clienti</div>
          <h1 className="page-title">{context.counterpartyName}</h1>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">
            <LogOut size={14} />
            Esci
          </button>
        </form>
      </div>

      <PortalNav />

      {children}

      <p className="muted" style={{ fontSize: 11, marginTop: 24 }}>
        Area riservata a sola lettura. Per correzioni o contestazioni contatta il tuo referente.
      </p>
    </div>
  );
}
