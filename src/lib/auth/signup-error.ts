export function mapSignupError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return "Utente già registrato";
  }

  if (normalized.includes("rate limit")) {
    return "Il servizio email di registrazione è temporaneamente limitato. Riprova più tardi.";
  }

  if (normalized.includes("email address not authorized")) {
    return "Registrazione temporaneamente non disponibile per questo indirizzo.";
  }

  if (normalized.includes("email address") && normalized.includes("invalid")) {
    return "Indirizzo email non valido";
  }

  return "Impossibile creare l'account";
}
