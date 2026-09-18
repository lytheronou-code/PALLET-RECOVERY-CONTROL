import { redirect } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { getPrimaryMembership } from "@/lib/data/organization";
import { signOutAction } from "@/lib/actions/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const membership = await getPrimaryMembership();

  if (!membership) {
    redirect("/onboarding");
  }

  const initials = membership.organizationName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "PR";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand-wrap">
          <div className="brand-mark">PR</div>
          <div className="sidebar-brand-text">
            <strong>Recovery Control</strong>
            <span>Operations desk</span>
          </div>
        </div>

        <SidebarNav />

        <div className="sidebar-footer">
          <div className="org-chip">
            <div className="org-avatar">{initials}</div>
            <div className="org-chip-text">
              <strong>{membership.organizationName}</strong>
              <span>{membership.role}</span>
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="signout-button">
              <LogOut size={14} />
              Esci
            </button>
          </form>
        </div>
      </aside>

      <main className="main-content">
        <AppTopbar organizationName={membership.organizationName} />
        {children}
      </main>
    </div>
  );
}
