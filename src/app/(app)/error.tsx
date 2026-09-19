"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getClientTranslator } from "@/i18n/client";

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const { t } = getClientTranslator();

  return (
    <div className="shell">
      <div className="route-error">
        <h2>{t("errorPages.generic.title")}</h2>
        <p>{t("errorPages.generic.description")}</p>
        {error.digest ? <p style={{ color: "var(--muted-2)", fontSize: 11 }}>Ref: {error.digest}</p> : null}
        <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
          <RefreshCw size={14} />
          {t("errorPages.generic.retry")}
        </button>
      </div>
    </div>
  );
}
