import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";

export default async function SignupPage() {
  const { locale, t } = await getT();

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <LanguageSwitcher locale={locale} ariaLabel={t("common.language")} />
        </div>
        <h1>{t("auth.signup.title")}</h1>
        <p className="subtitle">{t("auth.signup.subtitle")}</p>
        <SignupForm
          labels={{
            email: t("auth.signup.email"),
            password: t("auth.signup.password"),
            passwordHint: t("auth.signup.passwordHint"),
            submit: t("auth.signup.submit"),
            submitting: t("auth.signup.submitting"),
          }}
        />
        <p className="auth-footer">
          {t("auth.signup.hasAccount")} <Link href="/login">{t("auth.signup.signInLink")}</Link>
        </p>
      </div>
    </div>
  );
}
