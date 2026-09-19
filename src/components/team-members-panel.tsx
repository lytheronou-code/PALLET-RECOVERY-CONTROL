"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addOrganizationMemberAction,
  updateOrganizationMemberRoleAction,
  removeOrganizationMemberAction,
} from "@/lib/actions/team";
import { emptyFormState } from "@/lib/actions/form-state";
import { ORGANIZATION_ROLES, type OrganizationRole } from "@/lib/validation/team";
import { createFormatters } from "@/lib/format";
import type { OrganizationMemberWithRole } from "@/lib/data/organization";
import type { Locale } from "@/i18n/locale";

// No `t` prop: "use client" component, a Translator function cannot cross
// the server/client boundary as a prop (see client-portal-access-panel.tsx
// for the same established shape). The parent Server Component resolves
// every string via t(...) into this plain labels object instead. Rendered
// directly inside Settings' existing shared tab panel (no panel wrapper
// of its own), the same way OrganizationCompanyForm/OrganizationBrandingForm
// are -- the admin-only hint above it is settings/page.tsx's shared one.
export type TeamMembersPanelLabels = {
  emailLabel: string;
  emailPlaceholder: string;
  roleLabel: string;
  roleLabels: Record<OrganizationRole, string>;
  adding: string;
  addButton: string;
  addSectionHint: string;
  empty: string;
  tableEmail: string;
  tableName: string;
  tableRole: string;
  tableJoined: string;
  you: string;
  remove: string;
  removing: string;
  removeConfirm: string;
};

export function TeamMembersPanel({
  members,
  isAdmin,
  currentUserId,
  locale,
  currency,
  timeZone,
  labels,
}: {
  members: OrganizationMemberWithRole[];
  isAdmin: boolean;
  currentUserId: string;
  locale: Locale;
  currency: string;
  timeZone: string;
  labels: TeamMembersPanelLabels;
}) {
  const { formatDate } = createFormatters(locale, currency, timeZone);
  const [state, formAction, pending] = useActionState(addOrganizationMemberAction, emptyFormState);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRoleChange(memberId: string, role: OrganizationRole) {
    setRowError(null);
    setPendingRowId(memberId);
    startTransition(async () => {
      const result = await updateOrganizationMemberRoleAction(memberId, role);
      setPendingRowId(null);
      if (result.error) setRowError(result.error);
    });
  }

  function handleRemove(memberId: string) {
    if (!window.confirm(labels.removeConfirm)) return;
    setRowError(null);
    setPendingRowId(memberId);
    startTransition(async () => {
      const result = await removeOrganizationMemberAction(memberId);
      setPendingRowId(null);
      if (result.error) setRowError(result.error);
    });
  }

  return (
    <div>
      {isAdmin ? (
        <>
          <form action={formAction} className="form-grid-2" style={{ alignItems: "end" }}>
            {state.error ? <div className="form-error" style={{ gridColumn: "1 / -1" }}>{state.error}</div> : null}
            {state.message ? <div className="form-message" style={{ gridColumn: "1 / -1" }}>{state.message}</div> : null}
            <div className="field">
              <label htmlFor="team-member-email">{labels.emailLabel}</label>
              <input
                id="team-member-email"
                name="email"
                type="email"
                placeholder={labels.emailPlaceholder}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="team-member-role">{labels.roleLabel}</label>
              <select id="team-member-role" name="role" defaultValue="operator">
                {ORGANIZATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {labels.roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
              {pending ? labels.adding : labels.addButton}
            </button>
          </form>
          <p className="muted" style={{ fontSize: 11, marginTop: 8, marginBottom: 16 }}>
            {labels.addSectionHint}
          </p>
        </>
      ) : null}

      {rowError ? <div className="form-error" style={{ marginBottom: 12 }}>{rowError}</div> : null}

      {members.length === 0 ? (
        <div className="empty-state">{labels.empty}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{labels.tableEmail}</th>
                <th>{labels.tableName}</th>
                <th>{labels.tableRole}</th>
                <th>{labels.tableJoined}</th>
                {isAdmin ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const rowPending = pendingRowId === member.id;
                return (
                  <tr key={member.id}>
                    <td>
                      {member.email}
                      {isSelf ? <span className="muted" style={{ fontSize: 11 }}> ({labels.you})</span> : null}
                    </td>
                    <td>{member.displayName ?? "—"}</td>
                    <td>
                      {isAdmin && !isSelf ? (
                        <select
                          value={member.role}
                          disabled={rowPending}
                          onChange={(event) => handleRoleChange(member.id, event.target.value as OrganizationRole)}
                        >
                          {ORGANIZATION_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {labels.roleLabels[role]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (labels.roleLabels[member.role as OrganizationRole] ?? member.role)
                      )}
                    </td>
                    <td>{formatDate(member.createdAt)}</td>
                    {isAdmin ? (
                      <td>
                        {isSelf ? null : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={rowPending}
                            onClick={() => handleRemove(member.id)}
                          >
                            {rowPending ? labels.removing : labels.remove}
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
