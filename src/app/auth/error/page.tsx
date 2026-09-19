import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function AuthErrorPage() {
  const { t } = await getT();

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>{t("auth.error.title")}</h1>
        <p className="subtitle">{t("auth.error.description")}</p>
        <Link href="/login" className="btn btn-primary">
          {t("auth.error.backToLogin")}
        </Link>
      </div>
    </div>
  );
}
