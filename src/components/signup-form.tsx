"use client";

import { useActionState } from "react";
import { signUpAction } from "@/lib/actions/auth";
import { emptyFormState } from "@/lib/actions/form-state";

export type SignupFormLabels = {
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  submitting: string;
};

export function SignupForm({ labels }: { labels: SignupFormLabels }) {
  const [state, formAction, pending] = useActionState(signUpAction, emptyFormState);

  if (state.message) {
    return <div className="form-message">{state.message}</div>;
  }

  return (
    <form action={formAction}>
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">{labels.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">{labels.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="field-hint">{labels.passwordHint}</span>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
