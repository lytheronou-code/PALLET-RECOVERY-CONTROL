import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>Crea il tuo account</h1>
        <p className="subtitle">Inizia a gestire il recupero pallet</p>
        <SignupForm />
        <p className="auth-footer">
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
