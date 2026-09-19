import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { createClient } from "@/lib/supabase/server";
import { getPageContext } from "@/i18n/server";
import { getOrganizationBranding, getBrandingImageUrl } from "@/lib/data/branding";
import { listTimezones } from "@/lib/timezones";
import { OrganizationCompanyForm } from "@/components/organization-company-form";
import { OrganizationLocalizationForm } from "@/components/organization-localization-form";
import { OrganizationBrandingForm } from "@/components/organization-branding-form";
import { OnboardingPalletPresets } from "@/components/onboarding-pallet-presets";
import { OnboardingFirstCustomerForm } from "@/components/onboarding-first-customer-form";
import type { Tables } from "@/lib/supabase/database.types";

const STEPS = ["company", "localization", "branding", "operational", "firstCustomer", "ready"] as const;
type Step = (typeof STEPS)[number];

function isStep(value: string | undefined): value is Step {
  return !!value && (STEPS as readonly string[]).includes(value);
}

export default async function OnboardingSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step: stepParam } = await searchParams;
  const step: Step = isStep(stepParam) ? stepParam : "company";
  const stepIndex = STEPS.indexOf(step);

  const membership = await requireMembership();
  if (membership.role !== "admin") {
    redirect("/dashboard");
  }

  const { t } = await getPageContext(membership.organizationId);
  const supabase = await createClient();

  const [{ data: organization }, branding, { count: palletTypeCount }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", membership.organizationId).maybeSingle(),
    getOrganizationBranding(membership.organizationId),
    supabase
      .from("pallet_types")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId),
  ]);

  const [logoUrl, compactLogoUrl] = await Promise.all([
    getBrandingImageUrl(branding?.logo_path ?? null),
    getBrandingImageUrl(branding?.compact_logo_path ?? null),
  ]);

  const org: Tables<"organizations"> = organization ?? {
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

  const stepHref = (s: Step) => `/onboarding/setup?step=${s}`;
  const nextStep = STEPS[stepIndex + 1];

  return (
    <div className="shell" style={{ maxWidth: 760 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("onboarding.title")}</div>
          <h1 className="page-title">{t(`onboarding.steps.${step}.title`)}</h1>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          {t("common.actions.skip")}
        </Link>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <Link
            key={s}
            href={stepHref(s)}
            className={"filter-pill" + (s === step ? " active" : "")}
            aria-current={s === step ? "step" : undefined}
            style={{ opacity: i > stepIndex + 1 ? 0.5 : 1 }}
          >
            {i + 1}. {t(`onboarding.steps.${s}.label`)}
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-body">
          {step === "company" ? (
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
          ) : null}

          {step === "localization" ? (
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
          ) : null}

          {step === "branding" ? (
            <>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{t("onboarding.steps.branding.description")}</p>
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
            </>
          ) : null}

          {step === "operational" ? (
            <>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{t("onboarding.steps.operational.description")}</p>
              <OnboardingPalletPresets
                existingCount={palletTypeCount ?? 0}
                labels={{ usePreset: t("onboarding.steps.operational.usePreset"), skip: t("onboarding.steps.operational.skipPresets") }}
              />
            </>
          ) : null}

          {step === "firstCustomer" ? (
            <>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{t("onboarding.steps.firstCustomer.description")}</p>
              <OnboardingFirstCustomerForm
                labels={{
                  customerName: t("onboarding.steps.firstCustomer.customerName"),
                  save: t("common.actions.save"),
                  saving: t("common.actions.saving"),
                }}
              />
            </>
          ) : null}

          {step === "ready" ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <CheckCircle2 size={40} color="var(--accent)" style={{ marginBottom: 12 }} />
              <p style={{ marginBottom: 4 }}>{t("onboarding.steps.ready.description")}</p>
              <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>{t("onboarding.returnLater")}</p>
              <Link href="/dashboard" className="btn btn-primary">
                {t("onboarding.steps.ready.goToDashboard")}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {step !== "ready" && nextStep ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Link href={stepHref(nextStep)} className="btn btn-secondary btn-sm">
            {t("common.actions.next")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
