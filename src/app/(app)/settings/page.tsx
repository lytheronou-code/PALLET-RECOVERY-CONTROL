import Link from "next/link";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { createClient } from "@/lib/supabase/server";
import { getPageContext } from "@/i18n/server";
import { getOrganizationBranding, getBrandingImageUrl } from "@/lib/data/branding";
import { listTimezones } from "@/lib/timezones";
import { OrganizationCompanyForm } from "@/components/organization-company-form";
import { OrganizationLocalizationForm } from "@/components/organization-localization-form";
import { OrganizationBrandingForm } from "@/components/organization-branding-form";
import type { Tables } from "@/lib/supabase/database.types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Operatore",
  viewer: "Osservatore",
};

type SettingsTab = "company" | "localization" | "branding" | "clientPortal";

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return value === "company" || value === "localization" || value === "branding" || value === "clientPortal";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : "company";

  const membership = await requireMembership();
  const { t, formatDate } = await getPageContext(membership.organizationId);
  const isAdmin = membership.role === "admin";
  const supabase = await createClient();

  const [{ data: organization }, { data: userData }, { count: memberCount }, branding] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", membership.organizationId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organizationId),
    getOrganizationBranding(membership.organizationId),
  ]);

  const [logoUrl, compactLogoUrl] = await Promise.all([
    getBrandingImageUrl(branding?.logo_path ?? null),
    getBrandingImageUrl(branding?.compact_logo_path ?? null),
  ]);

  const org: Tables<"organizations"> =
    organization ?? {
      id: membership.organizationId,
      name: membership.organizationName,
      slug: "",
      created_at: "",
      default_locale: "en",
      default_currency: "EUR",
      timezone: "UTC",
      legal_name: null,
      trading_name: null,
      country_code: null,
      tax_id: null,
      vat_id: null,
      registration_number: null,
      address_line_1: null,
      address_line_2: null,
      city: null,
      region: null,
      postal_code: null,
      website: null,
      support_email: null,
      support_phone: null,
    };

  const tabHref = (tab: SettingsTab) => `/settings?tab=${tab}`;

  return (
    <div className="shell" style={{ maxWidth: 1040 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Workspace</div>
          <h1 className="page-title">{t("settings.title")}</h1>
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

      <div className="filter-bar" style={{ margin: "20px 0" }}>
        <Link href={tabHref("company")} className={"filter-pill" + (activeTab === "company" ? " active" : "")}>
          {t("settings.tabs.company")}
        </Link>
        <Link href={tabHref("localization")} className={"filter-pill" + (activeTab === "localization" ? " active" : "")}>
          {t("settings.tabs.localization")}
        </Link>
        <Link href={tabHref("branding")} className={"filter-pill" + (activeTab === "branding" ? " active" : "")}>
          {t("settings.tabs.branding")}
        </Link>
        <Link href={tabHref("clientPortal")} className={"filter-pill" + (activeTab === "clientPortal" ? " active" : "")}>
          {t("settings.tabs.clientPortal")}
        </Link>
      </div>

      <section className="panel">
        <div className="panel-body">
          {!isAdmin ? <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>{t("settings.localization.adminOnly")}</p> : null}

          {activeTab === "company" ? (
            isAdmin ? (
              <OrganizationCompanyForm
                organization={org}
                labels={{
                  legalName: t("settings.company.legalName"),
                  tradingName: t("settings.company.tradingName"),
                  countryCode: t("settings.company.countryCode"),
                  taxId: t("settings.company.taxId"),
                  vatId: t("settings.company.vatId"),
                  registrationNumber: t("settings.company.registrationNumber"),
                  addressLine1: t("settings.company.addressLine1"),
                  addressLine2: t("settings.company.addressLine2"),
                  city: t("settings.company.city"),
                  region: t("settings.company.region"),
                  postalCode: t("settings.company.postalCode"),
                  website: t("settings.company.website"),
                  supportEmail: t("settings.company.supportEmail"),
                  supportPhone: t("settings.company.supportPhone"),
                  save: t("common.actions.save"),
                  saving: t("common.actions.saving"),
                }}
              />
            ) : (
              <dl className="definition-list">
                <dt>{t("settings.company.legalName")}</dt><dd>{org.legal_name ?? "—"}</dd>
                <dt>{t("settings.company.countryCode")}</dt><dd>{org.country_code ?? "—"}</dd>
                <dt>{t("settings.company.city")}</dt><dd>{org.city ?? "—"}</dd>
              </dl>
            )
          ) : null}

          {activeTab === "localization" ? (
            isAdmin ? (
              <OrganizationLocalizationForm
                organization={org}
                timezones={listTimezones()}
                labels={{
                  defaultLanguage: t("settings.localization.defaultLanguage"),
                  defaultCurrency: t("settings.localization.defaultCurrency"),
                  timezone: t("settings.localization.timezone"),
                  save: t("common.actions.save"),
                  saving: t("common.actions.saving"),
                  languageEn: t("settings.localization.languageEn"),
                  languageIt: t("settings.localization.languageIt"),
                }}
              />
            ) : (
              <dl className="definition-list">
                <dt>{t("settings.localization.defaultLanguage")}</dt>
                <dd>{org.default_locale === "it" ? t("settings.localization.languageIt") : t("settings.localization.languageEn")}</dd>
                <dt>{t("settings.localization.defaultCurrency")}</dt><dd>{org.default_currency}</dd>
                <dt>{t("settings.localization.timezone")}</dt><dd>{org.timezone}</dd>
              </dl>
            )
          ) : null}

          {activeTab === "branding" ? (
            isAdmin ? (
              <OrganizationBrandingForm
                branding={branding}
                logoUrl={logoUrl}
                compactLogoUrl={compactLogoUrl}
                labels={{
                  portalName: t("settings.branding.portalName"),
                  logo: t("settings.branding.logo"),
                  compactLogo: t("settings.branding.compactLogo"),
                  primaryColor: t("settings.branding.primaryColor"),
                  secondaryColor: t("settings.branding.secondaryColor"),
                  supportEmail: t("settings.branding.supportEmail"),
                  supportPhone: t("settings.branding.supportPhone"),
                  website: t("settings.branding.website"),
                  welcomeMessageIt: t("settings.branding.welcomeMessageIt"),
                  welcomeMessageEn: t("settings.branding.welcomeMessageEn"),
                  save: t("common.actions.save"),
                  saving: t("common.actions.saving"),
                  uploadLogo: t("settings.branding.uploadLogo"),
                  uploading: t("common.actions.uploading"),
                }}
              />
            ) : (
              <dl className="definition-list">
                <dt>{t("settings.branding.portalName")}</dt><dd>{branding?.portal_name ?? "—"}</dd>
                <dt>{t("settings.branding.primaryColor")}</dt><dd>{branding?.primary_color ?? "—"}</dd>
              </dl>
            )
          ) : null}

          {activeTab === "clientPortal" ? (
            <p className="muted" style={{ fontSize: 12 }}>
              Gestisci l&apos;accesso al portale clienti dalla scheda di ogni singola controparte.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
