import { redirect } from "next/navigation";
import { getPrimaryMembership } from "@/lib/data/organization";
import { signOutAction } from "@/lib/actions/auth";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const membership = await getPrimaryMembership();

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Pallet Recovery</div>
        <SidebarNav />
        <div className="sidebar-footer">
          <div className="muted" style={{ marginBottom: 8 }}>
            {membership.organizationName}
          </div>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-danger">
              Esci
            </button>
          </form>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
