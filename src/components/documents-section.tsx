"use client";

import { useActionState, useState } from "react";
import {
  uploadDocumentAction,
  setDocumentStatusAction,
  setDocumentVisibilityAction,
  getSignedDocumentUrlAction,
  type DocumentLinkContext,
} from "@/lib/actions/documents";
import { emptyFormState } from "@/lib/actions/form-state";
import { DOCUMENT_TYPES } from "@/lib/validation/document";
import { createFormatters } from "@/lib/format";
import type { DocumentListItem } from "@/lib/data/documents";
import type { Locale } from "@/i18n/locale";

type RevalidateLink = Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">;

// Plain, already-resolved strings only -- built server-side in
// documents-panel.tsx via getPageContext()/t() and passed down here, since a
// "use client" component cannot receive a t() function as a prop. See
// src/components/organization-branding-form.tsx for the same shape.
export type DocumentsSectionLabels = {
  countSingular: string;
  countPlural: string;
  documentType: string;
  fileFieldLabel: string;
  notesOptional: string;
  uploadButton: string;
  uploading: string;
  noDocuments: string;
  table: {
    type: string;
    file: string;
    uploadedBy: string;
    date: string;
    visibility: string;
    status: string;
  };
  visibility: { client: string; internal: string };
  status: { active: string; superseded: string };
  actions: {
    open: string;
    makeInternal: string;
    share: string;
    markSuperseded: string;
    reactivate: string;
  };
  shownOfTotalTemplate: string;
  documentTypeLabels: Record<(typeof DOCUMENT_TYPES)[number], string>;
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}

export function DocumentsSection({
  title,
  link,
  items,
  total,
  locale,
  currency,
  timeZone,
  labels,
}: {
  title: string;
  link: DocumentLinkContext;
  items: DocumentListItem[];
  total: number;
  locale: Locale;
  currency: string;
  timeZone: string;
  labels: DocumentsSectionLabels;
}) {
  const { formatDate, formatFileSize } = createFormatters(locale, currency, timeZone);
  const [state, formAction, pending] = useActionState(uploadDocumentAction.bind(null, link), emptyFormState);
  const [rowError, setRowError] = useState<string | null>(null);
  const revalidateLink: RevalidateLink = link;

  async function handleDownload(documentId: string) {
    setRowError(null);
    const result = await getSignedDocumentUrlAction(documentId);
    if ("error" in result) {
      setRowError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  // Called directly (not via a plain <form action> fire-and-forget) so a
  // failed RLS check or RPC error surfaces to the user instead of the
  // button silently doing nothing.
  async function handleSetVisibility(documentId: string, visibility: "internal" | "client") {
    setRowError(null);
    const result = await setDocumentVisibilityAction(documentId, visibility, revalidateLink);
    if (result.error) setRowError(result.error);
  }

  async function handleSetStatus(documentId: string, status: "active" | "superseded") {
    setRowError(null);
    const result = await setDocumentStatusAction(documentId, status, revalidateLink);
    if (result.error) setRowError(result.error);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          <div className="panel-subtitle">
            {fillTemplate(total === 1 ? labels.countSingular : labels.countPlural, { count: String(total) })}
          </div>
        </div>
      </div>
      <div className="panel-body">
        <form action={formAction} className="document-upload-form">
          {state.error ? <div className="form-error">{state.error}</div> : null}
          {state.message ? <div className="form-message">{state.message}</div> : null}
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor={`documentType-${link.entityId}`}>{labels.documentType}</label>
              <select id={`documentType-${link.entityId}`} name="documentType" defaultValue="other">
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labels.documentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`file-${link.entityId}`}>{labels.fileFieldLabel}</label>
              <input
                id={`file-${link.entityId}`}
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`notes-${link.entityId}`}>{labels.notesOptional}</label>
            <textarea id={`notes-${link.entityId}`} name="notes" rows={2} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? labels.uploading : labels.uploadButton}
          </button>
        </form>

        {rowError ? (
          <div className="form-error" style={{ marginTop: 12 }}>
            {rowError}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            {labels.noDocuments}
          </div>
        ) : (
          <>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{labels.table.type}</th>
                    <th>{labels.table.file}</th>
                    <th>{labels.table.uploadedBy}</th>
                    <th>{labels.table.date}</th>
                    <th>{labels.table.visibility}</th>
                    <th>{labels.table.status}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        {labels.documentTypeLabels[doc.documentType as (typeof DOCUMENT_TYPES)[number]] ?? doc.documentType}
                      </td>
                      <td>
                        <div className="row-title">{doc.originalFilename}</div>
                        <div className="row-subtitle">
                          {formatFileSize(doc.fileSize)}
                          {doc.notes ? " · " + doc.notes : ""}
                        </div>
                      </td>
                      <td>{doc.uploadedByName ?? "—"}</td>
                      <td>{formatDate(doc.uploadedAt)}</td>
                      <td>
                        <span className={"badge " + (doc.visibility === "client" ? "badge-closed" : "badge-neutral")}>
                          {doc.visibility === "client" ? labels.visibility.client : labels.visibility.internal}
                        </span>
                      </td>
                      <td>
                        <span className={"badge " + (doc.status === "active" ? "badge-closed" : "badge-neutral")}>
                          {doc.status === "active" ? labels.status.active : labels.status.superseded}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload(doc.id)}>
                            {labels.actions.open}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleSetVisibility(doc.id, doc.visibility === "client" ? "internal" : "client")}
                          >
                            {doc.visibility === "client" ? labels.actions.makeInternal : labels.actions.share}
                          </button>
                          {doc.status === "active" ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSetStatus(doc.id, "superseded")}>
                              {labels.actions.markSuperseded}
                            </button>
                          ) : (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSetStatus(doc.id, "active")}>
                              {labels.actions.reactivate}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > items.length ? (
              <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                {fillTemplate(labels.shownOfTotalTemplate, { shown: String(items.length), total: String(total) })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
