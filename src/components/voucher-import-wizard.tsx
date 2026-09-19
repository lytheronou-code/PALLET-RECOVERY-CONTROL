"use client";

import { useActionState, useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv/parse";
import {
  VOUCHER_FIELDS,
  REQUIRED_VOUCHER_FIELDS,
  missingRequiredVoucherMappings,
  validateVoucherRows,
  type VoucherColumnMapping,
  type VoucherField,
  type VoucherLookups,
} from "@/lib/csv/voucher-import";
import { buildLookupKey } from "@/lib/csv/movement-import";
import { buildSiteLookup, type SiteRecord } from "@/lib/csv/site-lookup";
import { commitVoucherImportAction } from "@/lib/actions/import";
import type { ImportActionState } from "@/lib/actions/import";

type LookupOption = { id: string; code: string | null; legalName?: string };

export type VoucherImportWizardLabels = {
  invalidFile: string;
  prerequisiteNotice: string;
  csvFileLabel: string;
  expectedColumnsNote: string;
  fieldLabels: Record<VoucherField, string>;
  columnMappingTitle: string;
  unmapped: string;
  previewTitle: string;
  missingRequiredTemplate: string;
  totalRows: string;
  validRows: string;
  invalidRows: string;
  invalidRowsTitle: string;
  row: string;
  reason: string;
  back: string;
  confirmImportTemplate: string;
  importing: string;
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}

const AUTO_MAP_HINTS: Record<VoucherField, string[]> = {
  voucherNumber: ["numero buono", "voucher number", "buono", "voucher"],
  counterparty: ["controparte", "cliente", "counterparty", "customer", "ragione sociale"],
  palletType: ["pallet", "tipo pallet", "pallet type", "codice pallet"],
  site: ["sito", "site", "deposito", "hub"],
  issueDate: ["data emissione", "issue date", "data"],
  recoveryDueDate: ["scadenza", "scadenza recupero", "recovery due date", "due date"],
  quantity: ["quantita", "quantità", "qta", "quantity", "qty"],
  notes: ["note", "notes"],
};

function guessMapping(headers: string[]): VoucherColumnMapping {
  const mapping: VoucherColumnMapping = {};
  for (const field of VOUCHER_FIELDS) {
    const hints = AUTO_MAP_HINTS[field];
    const match = headers.find((h) => hints.includes(h.trim().toLowerCase()));
    if (match) mapping[field] = match;
  }
  return mapping;
}

const initialState: ImportActionState = {};

export function VoucherImportWizard({
  counterparties,
  palletTypes,
  sites,
  existingVoucherNumbers,
  labels,
}: {
  counterparties: LookupOption[];
  palletTypes: LookupOption[];
  sites: SiteRecord[];
  existingVoucherNumbers: string[];
  labels: VoucherImportWizardLabels;
}) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<VoucherColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [actionState, formAction, pending] = useActionState(commitVoucherImportAction, initialState);

  const lookups: VoucherLookups = useMemo(() => {
    const counterpartyIdByKey = new Map<string, string>();
    for (const cp of counterparties) {
      if (cp.code) counterpartyIdByKey.set(buildLookupKey(cp.code), cp.id);
      if (cp.legalName) counterpartyIdByKey.set(buildLookupKey(cp.legalName), cp.id);
    }
    const palletTypeIdByKey = new Map<string, string>();
    for (const pt of palletTypes) {
      if (pt.code) palletTypeIdByKey.set(buildLookupKey(pt.code), pt.id);
    }
    const existing = new Set(existingVoucherNumbers.map(buildLookupKey));
    return {
      counterpartyIdByKey,
      palletTypeIdByKey,
      existingVoucherNumbers: existing,
      siteLookup: buildSiteLookup(sites),
    };
  }, [counterparties, palletTypes, existingVoucherNumbers, sites]);

  const results = useMemo(
    () => (step === "review" ? validateVoucherRows(headers, rows, mapping, lookups) : []),
    [step, headers, rows, mapping, lookups],
  );
  const validCount = results.filter((r) => r.valid).length;
  const invalidResults = results.filter((r): r is Extract<typeof r, { valid: false }> => !r.valid);
  const missing = missingRequiredVoucherMappings(mapping);

  const payloadJson = useMemo(
    () => JSON.stringify({ filename, headers, rows, mapping }),
    [filename, headers, rows, mapping],
  );

  async function handleFile(file: File) {
    setParseError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setParseError(labels.invalidFile);
      return;
    }
    setFilename(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.headers));
    setStep("review");
  }

  if (step === "upload") {
    return (
      <div className="panel">
        <div className="panel-body">
          {parseError ? <div className="form-error">{parseError}</div> : null}
          {counterparties.length === 0 || palletTypes.length === 0 ? (
            <div className="form-message">
              {labels.prerequisiteNotice}
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="csvFile">{labels.csvFileLabel}</label>
            <input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            {labels.expectedColumnsNote}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {actionState.error ? <div className="form-error">{actionState.error}</div> : null}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{labels.columnMappingTitle}</h2>
            <div className="panel-subtitle">{filename}</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-grid-2">
            {VOUCHER_FIELDS.map((field) => (
              <div className="field" key={field}>
                <label htmlFor={`map-${field}`}>
                  {labels.fieldLabels[field]}
                  {REQUIRED_VOUCHER_FIELDS.includes(field) ? " *" : ""}
                </label>
                <select
                  id={`map-${field}`}
                  value={mapping[field] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                  }
                >
                  <option value="">{labels.unmapped}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{labels.previewTitle}</h2>
          </div>
        </div>
        <div className="panel-body">
          {missing.length > 0 ? (
            <div className="form-error">
              {interpolate(labels.missingRequiredTemplate, {
                fields: missing.map((f) => labels.fieldLabels[f]).join(", "),
              })}
            </div>
          ) : (
            <div className="grid premium-kpis three" style={{ marginBottom: 16 }}>
              <div className="metric-card">
                <div className="metric-top"><span className="metric-caption">{labels.totalRows}</span></div>
                <div className="metric-value">{results.length}</div>
              </div>
              <div className="metric-card">
                <div className="metric-top"><span className="metric-caption">{labels.validRows}</span></div>
                <div className="metric-value">{validCount}</div>
              </div>
              <div className="metric-card">
                <div className="metric-top"><span className="metric-caption">{labels.invalidRows}</span></div>
                <div className="metric-value">{invalidResults.length}</div>
              </div>
            </div>
          )}

          {invalidResults.length > 0 ? (
            <>
              <h3 style={{ fontSize: 14 }}>{labels.invalidRowsTitle}</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{labels.row}</th>
                      <th>{labels.reason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidResults.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber}>
                        <td>{r.rowNumber}</td>
                        <td>{r.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="payload" value={payloadJson} />
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep("upload")}
          >
            {labels.back}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || missing.length > 0 || validCount === 0}
          >
            {pending ? labels.importing : interpolate(labels.confirmImportTemplate, { count: String(validCount) })}
          </button>
        </div>
      </form>
    </div>
  );
}
