import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users } from "lucide-react";
import { resolveWorkspace } from "@/lib/data/workspace";

// Only reached by a user who holds BOTH an internal organization
// membership and an active client-portal membership -- resolveWorkspace()
// sends every other case straight to its one real destination, so this
// page never needs to guess: it re-resolves and only renders the choice
// when there genuinely are two.
export default async function SelectWorkspacePage() {
  const resolution = await resolveWorkspace();

  if (resolution.kind === "internal") redirect("/dashboard");
  if (resolution.kind === "portal") redirect("/portal");
  if (resolution.kind === "none") redirect("/onboarding");

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>Scegli area di lavoro</h1>
        <p className="subtitle">Il tuo account ha accesso sia alla piattaforma operativa che al portale clienti.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ justifyContent: "center" }}>
            <LayoutDashboard size={16} />
            Piattaforma operativa
          </Link>
          <Link href="/portal" className="btn btn-secondary" style={{ justifyContent: "center" }}>
            <Users size={16} />
            Portale clienti
          </Link>
        </div>
      </div>
    </div>
  );
}
