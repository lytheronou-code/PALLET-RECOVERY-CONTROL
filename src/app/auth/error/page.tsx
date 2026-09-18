import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>Link non valido</h1>
        <p className="subtitle">
          Il link di conferma è scaduto o non è più valido. Prova ad accedere di nuovo o registrati un&apos;altra volta.
        </p>
        <Link href="/login" className="btn btn-primary">
          Torna al login
        </Link>
      </div>
    </div>
  );
}
