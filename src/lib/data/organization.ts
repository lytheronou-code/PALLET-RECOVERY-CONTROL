import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
  userId: string;
};

export type OrganizationMemberOption = {
  userId: string;
  name: string;
};

export type OrganizationMemberWithRole = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
};

// RLS scopes organization_members to `user_id = auth.uid()`, so this only ever
// returns the calling user's own memberships regardless of the id/name join.
export async function getCurrentMemberships(): Promise<CurrentMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, user_id, role, organizations(name)")
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
      userId: row.user_id,
    }));
}

// Requires the members_read_org_membership policy (is_org_member) plus the
// org_members_read_profiles policy so peers' display names/emails resolve.
export async function listOrganizationMembers(organizationId: string): Promise<OrganizationMemberOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, profiles(email, display_name)")
    .eq("organization_id", organizationId);

  if (error || !data) return [];

  return (data as unknown as Array<{ user_id: string; profiles: { email: string; display_name: string | null } | null }>).map(
    (row) => ({
      userId: row.user_id,
      name: row.profiles?.display_name || row.profiles?.email || "Utente",
    }),
  );
}

// Richer sibling of listOrganizationMembers() above, for the Settings >
// Team tab: includes the membership id (needed to target a specific row
// for a role-change/removal RPC call) and role, which the assignee-picker
// callers of the plain version don't need. Kept as a separate function
// rather than widening the existing one's return shape, so the two
// existing assignee-picker call sites (recovery-cases pages) are
// untouched.
export async function listOrganizationMembersWithRoles(organizationId: string): Promise<OrganizationMemberWithRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at, profiles(email, display_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      user_id: string;
      role: string;
      created_at: string;
      profiles: { email: string; display_name: string | null } | null;
    }>
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.profiles?.email ?? "",
    displayName: row.profiles?.display_name ?? null,
    role: row.role,
    createdAt: row.created_at,
  }));
}

export async function getPrimaryMembership(): Promise<CurrentMembership | null> {
  const memberships = await getCurrentMemberships();
  return memberships[0] ?? null;
}

// For use inside Server Actions, which render no fallback UI of their own:
// bail out to onboarding/login rather than letting a mutation run without a
// tenant to scope it to.
export async function requireMembership(): Promise<CurrentMembership> {
  const membership = await getPrimaryMembership();
  if (!membership) {
    redirect("/onboarding");
  }
  return membership;
}
