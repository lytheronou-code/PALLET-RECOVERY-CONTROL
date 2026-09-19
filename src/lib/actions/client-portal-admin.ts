"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import type { FormState } from "@/lib/actions/form-state";

const grantSchema = z.object({
  email: z.string().trim().email("Inserisci un indirizzo email valido."),
});

// admin_grant_client_portal_access does its own admin/operator
// authorization check server-side (SECURITY DEFINER) -- requireMembership()
// here only ensures there's a session/org context to revalidate against,
// it is not the security boundary.
export async function grantClientPortalAccessAction(
  counterpartyId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMembership();

  const parsed = grantSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email non valida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_client_portal_access", {
    p_counterparty_id: counterpartyId,
    p_email: parsed.data.email,
  });

  if (error) {
    if (error.message.includes("no account found")) {
      return { error: "Nessun account trovato con questa email. Il cliente deve prima registrarsi." };
    }
    if (error.message.includes("insufficient privileges")) {
      return { error: "Solo un amministratore può gestire l'accesso al portale clienti." };
    }
    if (error.message.includes("already has an active portal membership")) {
      return { error: "Questo account ha già accesso attivo al portale di un'altra controparte." };
    }
    return { error: "Impossibile concedere l'accesso al portale." };
  }

  revalidatePath("/counterparties/" + counterpartyId);
  return { message: "Accesso al portale concesso." };
}

// Returns an explicit result (never void): a blocked RLS update or a
// single-active-membership conflict must never look like success in the
// UI. RLS itself is admin-only (see the migration), so a non-admin
// caller's UPDATE matches zero rows rather than erroring -- .select()
// + checking for a returned row is what surfaces that as a real failure.
export async function setClientPortalMembershipActiveAction(
  membershipId: string,
  active: boolean,
  counterpartyId: string,
): Promise<{ error?: string }> {
  await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_portal_memberships")
    .update({ active })
    .eq("id", membershipId)
    .select("id")
    .maybeSingle();

  revalidatePath("/counterparties/" + counterpartyId);

  if (error) {
    if (error.message.includes("client_portal_memberships_one_active_per_user")) {
      return { error: "Questo account ha già accesso attivo al portale di un'altra controparte." };
    }
    return { error: "Operazione non riuscita." };
  }

  if (!data) {
    return { error: "Solo un amministratore può gestire l'accesso al portale clienti." };
  }

  return {};
}
