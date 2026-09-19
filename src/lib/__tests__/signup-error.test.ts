import { describe, expect, it } from "vitest";
import { mapSignupError } from "@/lib/auth/signup-error";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

const tEn = createTranslator(getDictionary("en"));
const tIt = createTranslator(getDictionary("it"));

describe("mapSignupError", () => {
  it("maps duplicate user errors", () => {
    expect(mapSignupError("User already registered", tEn)).toBe(
      "An account with this email already exists.",
    );
    expect(mapSignupError("User already registered", tIt)).toBe(
      "Esiste già un account con questa email.",
    );
  });

  it("maps email rate limits without leaking provider details", () => {
    expect(mapSignupError("email rate limit exceeded", tEn)).toBe(
      "The signup email service is temporarily rate-limited. Please try again later.",
    );
  });

  it("maps unauthorized default SMTP recipients", () => {
    expect(mapSignupError("Email address not authorized", tEn)).toBe(
      "Signup is temporarily unavailable for this address.",
    );
  });

  it("maps invalid email errors", () => {
    expect(mapSignupError('Email address "qa@example.com" is invalid', tEn)).toBe(
      "Enter a valid email address.",
    );
  });

  it("keeps unknown provider errors generic", () => {
    expect(mapSignupError("unexpected auth provider error", tEn)).toBe(
      "We couldn't create your account. Please try again.",
    );
  });
});
