import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CurrentMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
};

// RLS scopes organization_members to `user_id = auth.uid()`, so this only ever
// returns the calling user's own memberships regardless of the id/name join.
export async function getCurrentMemberships(): Promise<CurrentMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .filter((row): row is typeof row & { organizations: { name: string } } => row.organizations !== null)
    .map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organizations.name,
      role: row.role,
    }));
}

export async function getPrimaryMembership(): Promise<CurrentMembership | null> {
  const memberships = await getCurrentMemberships();
  return memberships[0] ?? null;
}
