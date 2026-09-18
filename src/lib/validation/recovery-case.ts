import { z } from "zod";

export const PRIORITIES = ["low", "normal", "high", "critical"] as const;

export const createRecoveryCaseSchema = z.object({
  counterpartyId: z.string().uuid("Seleziona una controparte"),
  palletTypeId: z.string().uuid("Seleziona un tipo pallet"),
  voucherId: z.string().uuid().optional().or(z.literal("")),
  siteId: z.string().uuid().optional().or(z.literal("")),
  quantityClaimed: z.coerce.number().int().positive("La quantità deve essere un intero positivo"),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(PRIORITIES),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const RECOVERY_EVENT_TYPES = [
  "contact_attempt",
  "response",
  "scheduled",
  "pickup",
  "partial_recovery",
  "full_recovery",
  "dispute",
  "note",
  "closed",
] as const;

export const addRecoveryEventSchema = z.object({
  eventType: z.enum(RECOVERY_EVENT_TYPES),
  quantity: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
