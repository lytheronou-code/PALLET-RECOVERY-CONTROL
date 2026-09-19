"use client";

import { useState } from "react";
import { getPortalSignedDocumentUrlAction } from "@/lib/actions/portal";
import { createFormatters } from "@/lib/format";
import type { PortalDocument } from "@/lib/data/portal";
import type { Locale } from "@/i18n/locale";
import type { DOCUMENT_TYPES } from "@/lib/validation/document";

export type PortalDocumentsTableLabels = {
  table: {
    type: string;
    file: string;
    date: string;
  };
  open: string;
  documentTypeLabels: Record<(typeof DOCUMENT_TYPES)[number], string>;
};

export function PortalDocumentsTable({
  items,
  locale,
  currency,
  timeZone,
  labels,
}: {
  items: PortalDocument[];
  locale: Locale;
  currency: string;
  timeZone: string;
  labels: PortalDocumentsTableLabels;
}) {
  const [error, setError] = useState<string | null>(null);
  const { formatDate } = createFormatters(locale, currency, timeZone);

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
              <th>{labels.table.type}</th>
              <th>{labels.table.file}</th>
              <th>{labels.table.date}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((doc) => (
              <tr key={doc.id}>
                <td>{labels.documentTypeLabels[doc.documentType as keyof typeof labels.documentTypeLabels] ?? doc.documentType}</td>
                <td>
                  <div className="row-title">{doc.originalFilename}</div>
                </td>
                <td>{formatDate(doc.uploadedAt)}</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleOpen(doc.id)}>
                    {labels.open}
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
