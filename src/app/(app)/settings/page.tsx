import Link from "next/link";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { requireMembership, listOrganizationMembersWithRoles } from "@/lib/data/organization";
import { createClient } from "@/lib/supabase/server";
import { getPageContext } from "@/i18n/server";
import { getOrganizationBranding, getOrganizationBrandingLocalizations, getBrandingImageUrl } from "@/lib/data/branding";
import { buildWelcomeMessageLabels } from "@/lib/branding/welcome-message-labels";
import { buildLocaleNames } from "@/lib/i18n/locale-names";
import { isLocale } from "@/i18n/locale";
import { listTimezones } from "@/lib/timezones";
import { OrganizationCompanyForm } from "@/components/organization-company-form";
import { OrganizationLocalizationForm } from "@/components/organization-localization-form";
import { OrganizationBrandingForm } from "@/components/organization-branding-form";
import { TeamMembersPanel } from "@/components/team-members-panel";
import type { Tables } from "@/lib/supabase/database.types";
import type { TranslationKey } from "@/i18n/translator";

// DB enum (organization_members.role) -> translation-key dictionary, never
// an if/else per locale -- same pattern as status-badge.tsx.
const ROLE_LABEL_KEYS = {
  admin: "settings.team.roles.admin",
  operator: "settings.team.roles.operator",
  viewer: "settings.team.roles.viewer",
} as const satisfies Record<string, TranslationKey>;

type SettingsTab = "company" | "localization" | "branding" | "team" | "clientPortal";

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return (
    value === "company" ||
    value === "localization" ||
    value === "branding" ||
    value === "team" ||
    value === "clientPortal"
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : "company";

  const membership = await requireMembership();
  const { t, formatDate, locale, currency, timeZone } = await getPageContext(membership.organizationId);
  const isAdmin = membership.role === "admin";
  const roleKey = ROLE_LABEL_KEYS[membership.role as keyof typeof ROLE_LABEL_KEYS];
  const supabase = await createClient();

  const [
    { data: organization },
    { data: userData },
    { count: memberCount },
    branding,
    welcomeMessageLocalizations,
    teamMembers,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", membership.organizationId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", membership.organizationId),
    getOrganizationBranding(membership.organizationId),
    getOrganizationBrandingLocalizations(membership.organizationId),
    listOrganizationMembersWithRoles(membership.organizationId),
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
          <div className="eyebrow">{t("settings.eyebrow")}</div>
          <h1 className="page-title">{t("settings.title")}</h1>
          <div className="page-subtitle">{t("settings.subtitle")}</div>
        </div>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">{t("settings.overview.organization.title")}</h2><div className="panel-subtitle">{t("settings.overview.organization.subtitle")}</div></div>
            <Building2 size={17} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>{t("settings.overview.organization.name")}</dt><dd>{organization?.name ?? membership.organizationName}</dd>
              <dt>{t("settings.overview.organization.slug")}</dt><dd>{organization?.slug ?? "—"}</dd>
              <dt>{t("settings.overview.organization.createdAt")}</dt><dd>{formatDate(organization?.created_at)}</dd>
              <dt>{t("settings.team.members")}</dt><dd>{memberCount ?? "—"}</dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">{t("settings.overview.account.title")}</h2><div className="panel-subtitle">{t("settings.overview.account.subtitle")}</div></div>
            <UserRound size={17} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>{t("settings.overview.account.email")}</dt><dd>{userData.user?.email ?? "—"}</dd>
              <dt>{t("settings.team.role")}</dt><dd>{roleKey ? t(roleKey) : membership.role}</dd>
              <dt>{t("settings.overview.account.security")}</dt><dd><span className="badge badge-closed"><ShieldCheck size={11} />{t("settings.overview.account.rlsActive")}</span></dd>
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
        <Link href={tabHref("team")} className={"filter-pill" + (activeTab === "team" ? " active" : "")}>
          {t("settings.tabs.team")}
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
                locale={locale}
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
                  languageNames: buildLocaleNames(t),
                }}
              />
            ) : (
              <dl className="definition-list">
                <dt>{t("settings.localization.defaultLanguage")}</dt>
                <dd>{buildLocaleNames(t)[isLocale(org.default_locale) ? org.default_locale : "en"]}</dd>
                <dt>{t("settings.localization.defaultCurrency")}</dt><dd>{org.default_currency}</dd>
                <dt>{t("settings.localization.timezone")}</dt><dd>{org.timezone}</dd>
              </dl>
            )
          ) : null}

          {activeTab === "branding" ? (
            isAdmin ? (
              <OrganizationBrandingForm
                branding={branding}
                welcomeMessageLocalizations={welcomeMessageLocalizations}
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
                  welcomeMessageLabels: buildWelcomeMessageLabels(t),
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

          {activeTab === "team" ? (
            <TeamMembersPanel
              members={teamMembers}
              isAdmin={isAdmin}
              currentUserId={membership.userId}
              locale={locale}
              currency={currency}
              timeZone={timeZone}
              labels={{
                emailLabel: t("settings.team.emailLabel"),
                emailPlaceholder: t("settings.team.emailPlaceholder"),
                roleLabel: t("settings.team.role"),
                roleLabels: {
                  admin: t("settings.team.roles.admin"),
                  operator: t("settings.team.roles.operator"),
                  viewer: t("settings.team.roles.viewer"),
                },
                adding: t("common.actions.saving"),
                addButton: t("settings.team.addButton"),
                addSectionHint: t("settings.team.addSectionHint"),
                empty: t("settings.team.empty"),
                tableEmail: t("settings.team.tableEmail"),
                tableName: t("settings.team.tableName"),
                tableRole: t("settings.team.role"),
                tableJoined: t("settings.team.tableJoined"),
                you: t("settings.team.you"),
                remove: t("settings.team.remove"),
                removing: t("settings.team.removing"),
                removeConfirm: t("settings.team.removeConfirm"),
              }}
            />
          ) : null}

          {activeTab === "clientPortal" ? (
            <p className="muted" style={{ fontSize: 12 }}>
              {t("settings.clientPortalTab.description")}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
