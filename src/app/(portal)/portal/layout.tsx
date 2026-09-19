import { LogOut } from "lucide-react";
import { requirePortalContext } from "@/lib/data/portal";
import { signOutAction } from "@/lib/actions/auth";
import { PortalNav } from "@/components/portal-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePortalContext();
  const { locale, t } = await getT(context.organizationId);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 48px" }}>
      <div className="header" style={{ marginBottom: 8 }}>
        <div className="page-heading">
          <div className="eyebrow">{t("clientPortal.welcome")}</div>
          <h1 className="page-title">{context.counterpartyName}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSwitcher locale={locale} ariaLabel={t("common.language")} />
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary btn-sm">
              <LogOut size={14} />
              {t("common.actions.signOut")}
            </button>
          </form>
        </div>
      </div>

      <PortalNav
        labels={{
          overview: t("clientPortal.nav.overview"),
          vouchers: t("clientPortal.nav.vouchers"),
          movements: t("clientPortal.nav.movements"),
          recoveryCases: t("clientPortal.nav.recoveryCases"),
          documents: t("clientPortal.nav.documents"),
        }}
      />

      {children}

      <p className="muted" style={{ fontSize: 11, marginTop: 24 }}>
        {t("clientPortal.readOnlyNotice")}
      </p>
    </div>
  );
}
