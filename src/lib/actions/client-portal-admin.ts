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
      return { error: "Permessi insufficienti per questa operazione." };
    }
    return { error: "Impossibile concedere l'accesso al portale." };
  }

  revalidatePath("/counterparties/" + counterpartyId);
  return { message: "Accesso al portale concesso." };
}

export async function setClientPortalMembershipActiveAction(
  membershipId: string,
  active: boolean,
  counterpartyId: string,
): Promise<void> {
  await requireMembership();
  const supabase = await createClient();
  await supabase.from("client_portal_memberships").update({ active }).eq("id", membershipId);
  revalidatePath("/counterparties/" + counterpartyId);
}
