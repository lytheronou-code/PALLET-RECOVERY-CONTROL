"use client";

import { useState } from "react";
import { getPortalSignedDocumentUrlAction } from "@/lib/actions/portal";
import { DOCUMENT_TYPE_LABELS } from "@/lib/validation/document";
import { formatDate } from "@/lib/format";
import type { PortalDocument } from "@/lib/data/portal";

export function PortalDocumentsTable({ items }: { items: PortalDocument[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleOpen(documentId: string) {
    setError(null);
    const result = await getPortalSignedDocumentUrlAction(documentId);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {error ? <div className="form-error" style={{ marginBottom: 12 }}>{error}</div> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>File</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((doc) => (
              <tr key={doc.id}>
                <td>{DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.documentType}</td>
                <td>
                  <div className="row-title">{doc.originalFilename}</div>
                  {doc.notes ? <div className="row-subtitle">{doc.notes}</div> : null}
                </td>
                <td>{formatDate(doc.uploadedAt)}</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleOpen(doc.id)}>
                    Apri
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
