"use client";

import { useActionState } from "react";
import { signUpAction } from "@/lib/actions/auth";
import { emptyFormState } from "@/lib/actions/form-state";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, emptyFormState);

  if (state.message) {
    return <div className="form-message">{state.message}</div>;
  }

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creazione account…" : "Crea account"}
      </button>
    </form>
  );
}
