import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getPrimaryMembership } from "@/lib/data/organization";
import { signOutAction } from "@/lib/actions/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppTopbar } from "@/components/app-topbar";
import { getT } from "@/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const membership = await getPrimaryMembership();

  if (!membership) {
    redirect("/onboarding");
  }

  const { locale, t } = await getT(membership.organizationId);

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
            <span>{t("nav.operationsDesk")}</span>
          </div>
        </div>

        <SidebarNav
          labels={{
            ariaLabel: t("nav.ariaLabel"),
            groups: {
              control: t("nav.groups.control"),
              data: t("nav.groups.data"),
              system: t("nav.groups.system"),
            },
            items: {
              dashboard: t("nav.items.dashboard"),
              recoveryCases: t("nav.items.recoveryCases"),
              reconciliation: t("nav.items.reconciliation"),
              vouchers: t("nav.items.vouchers"),
              movements: t("nav.items.movements"),
              import: t("nav.items.import"),
              counterparties: t("nav.items.counterparties"),
              sites: t("nav.items.sites"),
              palletTypes: t("nav.items.palletTypes"),
              report: t("nav.items.report"),
              settings: t("nav.items.settings"),
            },
          }}
        />

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
              {t("common.actions.signOut")}
            </button>
          </form>
        </div>
      </aside>

      <main className="main-content">
        <AppTopbar
          organizationName={membership.organizationName}
          locale={locale}
          labels={{
            searchPlaceholder: t("topbar.searchPlaceholder"),
            searchAriaLabel: t("topbar.searchAriaLabel"),
            searchHint: t("topbar.searchHint"),
            urgentActions: t("topbar.urgentActions"),
            newCase: t("topbar.newCase"),
            language: t("common.language"),
          }}
        />
        {children}
      </main>
    </div>
  );
}
