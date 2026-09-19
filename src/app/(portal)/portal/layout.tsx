import { LogOut } from "lucide-react";
import { requirePortalContext } from "@/lib/data/portal";
import { signOutAction } from "@/lib/actions/auth";
import { PortalNav } from "@/components/portal-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";
import { getOrganizationBranding, getBrandingImageUrl } from "@/lib/data/branding";
import { getReadableTextColor } from "@/lib/branding/color";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePortalContext();
  const { locale, t } = await getT(context.organizationId);
  const branding = await getOrganizationBranding(context.organizationId);
  const logoUrl = await getBrandingImageUrl(branding?.logo_path ?? null);

  const portalName = branding?.portal_name || context.counterpartyName;
  const welcomeMessage = locale === "it" ? branding?.welcome_message_it : branding?.welcome_message_en;

  const brandStyle: React.CSSProperties & Record<string, string> = {};
  if (branding?.primary_color) {
    brandStyle["--accent"] = branding.primary_color;
    brandStyle["--portal-text-on-accent"] = getReadableTextColor(branding.primary_color);
  }

  return (
    <div className="portal-shell" style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 48px", ...brandStyle }}>
      <div className="header" style={{ marginBottom: 8 }}>
        <div className="page-heading">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={portalName} className="portal-brand-logo" style={{ marginBottom: 6 }} />
          ) : (
            <div className="eyebrow">{portalName}</div>
          )}
          <h1 className="page-title">{context.counterpartyName}</h1>
          {welcomeMessage ? <div className="page-subtitle">{welcomeMessage}</div> : null}
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
        {branding?.support_email ? ` ${branding.support_email}` : ""}
        {branding?.support_phone ? ` · ${branding.support_phone}` : ""}
      </p>

      {/* Discreet, always-on attribution for now -- deliberately a plain
          text line (not a config flag) so a future plan-controlled toggle
          can gate this line without restructuring the layout. */}
      <p className="portal-powered-by">{t("common.poweredBy", { product: "Pallet Recovery Control" })}</p>
    </div>
  );
}
