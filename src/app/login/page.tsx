import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { locale, t } = await getT();

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <LanguageSwitcher locale={locale} ariaLabel={t("common.language")} />
        </div>
        <h1>{t("auth.login.title")}</h1>
        <p className="subtitle">{t("auth.login.subtitle")}</p>
        <LoginForm
          next={next ?? "/dashboard"}
          labels={{
            email: t("auth.login.email"),
            password: t("auth.login.password"),
            submit: t("auth.login.submit"),
            submitting: t("auth.login.submitting"),
          }}
        />
        <p className="auth-footer">
          {t("auth.login.noAccount")} <Link href="/signup">{t("auth.login.signUpLink")}</Link>
        </p>
      </div>
    </div>
  );
}
