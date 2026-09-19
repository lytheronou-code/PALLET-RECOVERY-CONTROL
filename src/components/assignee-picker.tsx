"use client";

import { useActionState, useRef } from "react";
import { assignRecoveryCaseAction } from "@/lib/actions/recovery-cases";
import { emptyFormState } from "@/lib/actions/form-state";
import type { OrganizationMemberOption } from "@/lib/data/organization";

export type AssigneePickerLabels = {
  unassigned: string;
};

export function AssigneePicker({
  caseId,
  assigneeUserId,
  members,
  labels,
}: {
  caseId: string;
  assigneeUserId: string | null;
  members: OrganizationMemberOption[];
  labels: AssigneePickerLabels;
}) {
  const action = assignRecoveryCaseAction.bind(null, caseId);
  const [state, formAction] = useActionState(action, emptyFormState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      <select
        name="assigneeUserId"
        defaultValue={assigneeUserId ?? ""}
        className="assignee-select"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">{labels.unassigned}</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
      {state.error ? (
        <div className="row-subtitle" style={{ color: "var(--danger)" }}>
          {state.error}
        </div>
      ) : null}
    </form>
  );
}
