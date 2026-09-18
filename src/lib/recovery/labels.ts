import type { RECOVERY_EVENT_TYPES } from "@/lib/validation/recovery-case";

export const EVENT_LABELS: Record<(typeof RECOVERY_EVENT_TYPES)[number] | "created", string> = {
  created: "Pratica creata",
  contact_attempt: "Contatto effettuato",
  response: "Risposta ricevuta",
  scheduled: "Recupero programmato",
  pickup: "Ritiro effettuato",
  partial_recovery: "Recupero parziale",
  full_recovery: "Recupero completo",
  dispute: "Contestazione",
  note: "Nota",
  closed: "Chiusura (non recuperato)",
};
