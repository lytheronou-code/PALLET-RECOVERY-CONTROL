"use client";

import { useActionState } from "react";
import { signInAction } from "@/lib/actions/auth";
import { emptyFormState } from "@/lib/actions/form-state";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, emptyFormState);

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
