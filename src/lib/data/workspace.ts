import "server-only";
import { getPrimaryMembership } from "@/lib/data/organization";
import { getPortalContext } from "@/lib/data/portal";

// Deterministic post-login routing: an internal operator (organization_members)
// and a client-portal user (client_portal_memberships) are disjoint by
// design -- never the same "type" of row -- but nothing stops one person
// from legitimately holding both (e.g. an employee who is also a
// contact for their own supplier's counterparty record). Resolve both in
// parallel and let the caller (root page / login) decide where to send
// each combination; this never grants access itself, it only reads what
// requireMembership()/requirePortalContext() would already allow.
export type WorkspaceResolution =
  | { kind: "internal" }
  | { kind: "portal" }
  | { kind: "both" }
  | { kind: "none" };

export async function resolveWorkspace(): Promise<WorkspaceResolution> {
  const [membership, portalContext] = await Promise.all([getPrimaryMembership(), getPortalContext()]);
  const hasInternal = Boolean(membership);
  const hasPortal = Boolean(portalContext);
  if (hasInternal && hasPortal) return { kind: "both" };
  if (hasInternal) return { kind: "internal" };
  if (hasPortal) return { kind: "portal" };
  return { kind: "none" };
}
