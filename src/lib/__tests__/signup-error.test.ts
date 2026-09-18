import { describe, expect, it } from "vitest";
import { mapSignupError } from "@/lib/auth/signup-error";

describe("mapSignupError", () => {
  it("maps duplicate user errors", () => {
    expect(mapSignupError("User already registered")).toBe("Utente già registrato");
  });

  it("maps email rate limits without leaking provider details", () => {
    expect(mapSignupError("email rate limit exceeded")).toBe(
      "Il servizio email di registrazione è temporaneamente limitato. Riprova più tardi.",
    );
  });

  it("maps unauthorized default SMTP recipients", () => {
    expect(mapSignupError("Email address not authorized")).toBe(
      "Registrazione temporaneamente non disponibile per questo indirizzo.",
    );
  });

  it("maps invalid email errors", () => {
    expect(mapSignupError('Email address "qa@example.com" is invalid')).toBe(
      "Indirizzo email non valido",
    );
  });

  it("keeps unknown provider errors generic", () => {
    expect(mapSignupError("unexpected auth provider error")).toBe(
      "Impossibile creare l'account",
    );
  });
});
