import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ClientPortalMembershipRow = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  active: boolean;
  createdAt: string;
};

// Relies on read_client_portal_memberships RLS (self OR admin/operator of
// the owning organization) -- an operator viewing a counterparty they
// don't belong to gets zero rows, never an error.
export async function listClientPortalMemberships(
  organizationId: string,
  counterpartyId: string,
): Promise<ClientPortalMembershipRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_portal_memberships")
    .select("id, user_id, active, created_at, profiles(email, display_name)")
    .eq("organization_id", organizationId)
    .eq("counterparty_id", counterpartyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      user_id: string;
      active: boolean;
      created_at: string;
      profiles: { email: string; display_name: string | null } | null;
    }>
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.profiles?.email ?? "—",
    displayName: row.profiles?.display_name ?? null,
    active: row.active,
    createdAt: row.created_at,
  }));
}
