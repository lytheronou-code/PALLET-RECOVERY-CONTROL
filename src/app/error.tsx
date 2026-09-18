"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function RootError({
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
    <div className="auth-shell">
      <div className="auth-card card route-error" style={{ margin: 0 }}>
        <h2>Si è verificato un errore imprevisto</h2>
        <p>L&apos;operazione non è andata a buon fine. Riprova tra qualche istante.</p>
        {error.digest ? <p style={{ color: "var(--muted-2)", fontSize: 11 }}>Riferimento: {error.digest}</p> : null}
        <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
          <RefreshCw size={14} />
          Riprova
        </button>
      </div>
    </div>
  );
}
