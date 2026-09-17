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
    supabase
      .from("organizations")
      .select("name, slug, created_at")
      .eq("id", membership.organizationId)
      .maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId),
  ]);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">Impostazioni</div>
      </div>

      <h2 style={{ fontSize: 14 }}>Organizzazione</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, margin: 0 }}>
          Nome: <strong>{organization?.name ?? membership.organizationName}</strong>
          <br />
          Slug: {organization?.slug ?? "—"}
          <br />
          Creata il: {formatDate(organization?.created_at)}
          <br />
          Membri: {memberCount ?? "—"}
        </p>
      </div>

      <h2 style={{ fontSize: 14 }}>Il tuo account</h2>
      <div className="card">
        <p style={{ fontSize: 14, margin: 0 }}>
          Email: {userData.user?.email ?? "—"}
          <br />
          Ruolo: {ROLE_LABELS[membership.role] ?? membership.role}
        </p>
      </div>
    </div>
  );
}
