import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Operatore",
  viewer: "Osservatore",
};

export default async function SettingsPage() {
  const membership = await requireMembership();
  const supabase = await createClient();

  const [{ data: organization }, { data: userData }, { count: memberCount }] = await Promise.all([
    supabase.from("organizations").select("name, slug, created_at").eq("id", membership.organizationId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organizationId),
  ]);

  return (
    <div className="shell" style={{ maxWidth: 1040 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Workspace</div>
          <h1 className="page-title">Impostazioni</h1>
          <div className="page-subtitle">Identità organizzazione, account e modello di accesso corrente.</div>
        </div>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">Organizzazione</h2><div className="panel-subtitle">Workspace che isola dati e operazioni.</div></div>
            <Building2 size={17} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>Nome</dt><dd>{organization?.name ?? membership.organizationName}</dd>
              <dt>Slug</dt><dd>{organization?.slug ?? "—"}</dd>
              <dt>Creata il</dt><dd>{formatDate(organization?.created_at)}</dd>
              <dt>Membri</dt><dd>{memberCount ?? "—"}</dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">Il tuo account</h2><div className="panel-subtitle">Sessione e ruolo nel workspace.</div></div>
            <UserRound size={17} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>Email</dt><dd>{userData.user?.email ?? "—"}</dd>
              <dt>Ruolo</dt><dd>{ROLE_LABELS[membership.role] ?? membership.role}</dd>
              <dt>Sicurezza</dt><dd><span className="badge badge-closed"><ShieldCheck size={11} />RLS attiva</span></dd>
            </dl>
          </div>
        </section>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div><h2 className="panel-title">Prossimo livello amministrativo</h2><div className="panel-subtitle">Funzioni deliberate, non ancora abilitate nel core.</div></div>
        </div>
        <div className="panel-body">
          <div className="quick-start">
            <div><strong>Team & inviti</strong><span className="muted" style={{ display: "block", fontSize: 11, marginTop: 3 }}>Ruoli, assegnatari e code personali.</span></div>
            <div><strong>Siti operativi</strong><span className="muted" style={{ display: "block", fontSize: 11, marginTop: 3 }}>Depositi, punti di ritiro e location cliente.</span></div>
            <div><strong>Notifiche</strong><span className="muted" style={{ display: "block", fontSize: 11, marginTop: 3 }}>Digest e alert sulle scadenze.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
