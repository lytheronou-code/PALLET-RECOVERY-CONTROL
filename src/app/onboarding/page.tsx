import { redirect } from "next/navigation";
import { getPrimaryMembership } from "@/lib/data/organization";
import { OnboardingForm } from "@/components/onboarding-form";
import { getT } from "@/i18n/server";

export default async function OnboardingPage() {
  const membership = await getPrimaryMembership();
  if (membership) {
    redirect("/dashboard");
  }

  const { t } = await getT();

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>{t("onboarding.steps.company.title")}</h1>
        <p className="subtitle">{t("onboarding.subtitle")}</p>
        <OnboardingForm
          labels={{
            organizationName: t("onboarding.steps.company.organizationName"),
            submit: t("common.actions.create"),
            submitting: t("common.actions.creating"),
          }}
        />
      </div>
    </div>
  );
}
