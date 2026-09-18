import { redirect } from "next/navigation";
import { getPrimaryMembership } from "@/lib/data/organization";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const membership = await getPrimaryMembership();
  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>Crea la tua organizzazione</h1>
        <p className="subtitle">
          Ogni pallet, buono e pratica di recupero appartiene alla tua organizzazione.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
