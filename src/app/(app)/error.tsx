"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

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

  return (
    <div className="shell">
      <div className="route-error">
        <h2>Si è verificato un errore imprevisto</h2>
        <p>
          L&apos;operazione non è andata a buon fine. Riprova; se il problema persiste, controlla la connessione o
          contatta l&apos;amministratore dell&apos;organizzazione.
        </p>
        {error.digest ? <p style={{ color: "var(--muted-2)", fontSize: 11 }}>Riferimento: {error.digest}</p> : null}
        <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
          <RefreshCw size={14} />
          Riprova
        </button>
      </div>
    </div>
  );
}
