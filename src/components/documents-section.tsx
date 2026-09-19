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
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/validation/document";
import { createFormatters } from "@/lib/format";
import type { DocumentListItem } from "@/lib/data/documents";
import type { Locale } from "@/i18n/locale";

type RevalidateLink = Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">;

export function DocumentsSection({
  title,
  link,
  items,
  total,
  locale,
  currency,
  timeZone,
}: {
  title: string;
  link: DocumentLinkContext;
  items: DocumentListItem[];
  total: number;
  locale: Locale;
  currency: string;
  timeZone: string;
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
          <div className="panel-subtitle">{total} {total === 1 ? "documento" : "documenti"}</div>
        </div>
      </div>
      <div className="panel-body">
        <form action={formAction} className="document-upload-form">
          {state.error ? <div className="form-error">{state.error}</div> : null}
          {state.message ? <div className="form-message">{state.message}</div> : null}
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor={`documentType-${link.entityId}`}>Tipo documento</label>
              <select id={`documentType-${link.entityId}`} name="documentType" defaultValue="other">
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`file-${link.entityId}`}>File (PDF, JPG, PNG, WEBP — max 15 MB)</label>
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
            <label htmlFor={`notes-${link.entityId}`}>Note (opzionale)</label>
            <textarea id={`notes-${link.entityId}`} name="notes" rows={2} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Caricamento…" : "Carica documento"}
          </button>
        </form>

        {rowError ? (
          <div className="form-error" style={{ marginTop: 12 }}>
            {rowError}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            Nessun documento caricato.
          </div>
        ) : (
          <>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>File</th>
                    <th>Caricato da</th>
                    <th>Data</th>
                    <th>Visibilità</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id}>
                      <td>{DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.documentType}</td>
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
                          {doc.visibility === "client" ? "Cliente" : "Interno"}
                        </span>
                      </td>
                      <td>
                        <span className={"badge " + (doc.status === "active" ? "badge-closed" : "badge-neutral")}>
                          {doc.status === "active" ? "Attivo" : "Superato"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload(doc.id)}>
                            Apri
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleSetVisibility(doc.id, doc.visibility === "client" ? "internal" : "client")}
                          >
                            {doc.visibility === "client" ? "Rendi interno" : "Condividi"}
                          </button>
                          {doc.status === "active" ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSetStatus(doc.id, "superseded")}>
                              Segna superato
                            </button>
                          ) : (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSetStatus(doc.id, "active")}>
                              Riattiva
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
                Mostrati i {items.length} documenti più recenti su {total} totali.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
