import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <h1>Pallet Recovery Control</h1>
        <p className="subtitle">Accedi al tuo spazio di lavoro</p>
        <LoginForm next={next ?? "/dashboard"} />
        <p className="auth-footer">
          Non hai un account? <Link href="/signup">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
