"use client";

import { useActionState, useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv/parse";
import {
  MOVEMENT_FIELDS,
  REQUIRED_MOVEMENT_FIELDS,
  buildLookupKey,
  missingRequiredMappings,
  validateMovementRows,
  type ColumnMapping,
  type MovementField,
  type MovementLookups,
} from "@/lib/csv/movement-import";
import { buildSiteLookup, type SiteRecord } from "@/lib/csv/site-lookup";
import { commitMovementImportAction, type ImportActionState } from "@/lib/actions/import";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";
import type { Locale } from "@/i18n/locale";

type LookupOption = { id: string; code: string | null; legalName?: string };

// Plain, already-resolved strings only -- this crosses the server -> client
// boundary as a prop from import/page.tsx's getPageContext(), so it can
// never carry a t() function itself (see src/components/documents-section.tsx
// and src/components/organization-branding-form.tsx for the same pattern).
export type ImportWizardLabels = {
  fileEmptyError: string;
  prerequisiteMissing: string;
  csvFileLabel: string;
  expectedColumns: string;
  step1Title: string;
  unmapped: string;
  step2Title: string;
  missingRequiredFieldsTemplate: string;
  totalRows: string;
  validRows: string;
  invalidRows: string;
  invalidRowsTitle: string;
  rowNumber: string;
  reason: string;
  back: string;
  importing: string;
  confirmImportTemplate: string;
  fields: Record<MovementField, string>;
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}

// English/Italian recognition hints for auto-mapping uploaded CSV headers --
// these are matched against the *file's own* column names, not rendered as
// UI copy, so they stay independent of the active viewer locale.
const AUTO_MAP_HINTS: Record<MovementField, string[]> = {
  movementDate: ["data", "date", "data movimento", "movement date"],
  counterparty: ["controparte", "cliente", "counterparty", "customer", "ragione sociale"],
  palletType: ["pallet", "tipo pallet", "pallet type", "codice pallet"],
  site: ["sito", "site", "deposito", "hub"],
  direction: ["direzione", "direction", "dir", "in/out"],
  quantity: ["quantita", "quantità", "qta", "quantity", "qty"],
  documentType: ["tipo documento", "document type", "doc tipo"],
  documentNumber: ["numero documento", "document number", "doc numero", "n. documento"],
  voucherNumber: ["numero buono", "voucher number", "buono"],
  notes: ["note", "notes"],
};

function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of MOVEMENT_FIELDS) {
    const hints = AUTO_MAP_HINTS[field];
    const match = headers.find((h) => hints.includes(h.trim().toLowerCase()));
    if (match) mapping[field] = match;
  }
  return mapping;
}

const initialState: ImportActionState = {};

export function ImportWizard({
  counterparties,
  palletTypes,
  sites,
  labels,
  locale,
}: {
  counterparties: LookupOption[];
  palletTypes: LookupOption[];
  sites: SiteRecord[];
  labels: ImportWizardLabels;
  locale: Locale;
}) {
  // Locale (a plain string, unlike a bound t() function) can cross the
  // server -> client boundary as a prop, so per-row CSV validation errors
  // -- which depend on the *data*, not just static labels -- can still be
  // translated here instead of only at the initial render.
  const t = useMemo(() => createTranslator(getDictionary(locale)), [locale]);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [actionState, formAction, pending] = useActionState(commitMovementImportAction, initialState);

  const lookups: MovementLookups = useMemo(() => {
    const counterpartyIdByKey = new Map<string, string>();
    for (const cp of counterparties) {
      if (cp.code) counterpartyIdByKey.set(buildLookupKey(cp.code), cp.id);
      if (cp.legalName) counterpartyIdByKey.set(buildLookupKey(cp.legalName), cp.id);
    }
    const palletTypeIdByKey = new Map<string, string>();
    for (const pt of palletTypes) {
      if (pt.code) palletTypeIdByKey.set(buildLookupKey(pt.code), pt.id);
    }
    return { counterpartyIdByKey, palletTypeIdByKey, siteLookup: buildSiteLookup(sites) };
  }, [counterparties, palletTypes, sites]);

  const results = useMemo(
    () => (step === "review" ? validateMovementRows(headers, rows, mapping, lookups, t) : []),
    [step, headers, rows, mapping, lookups, t],
  );
  const validCount = results.filter((r) => r.valid).length;
  const invalidResults = results.filter((r): r is Extract<typeof r, { valid: false }> => !r.valid);
  const missing = missingRequiredMappings(mapping);

  const payloadJson = useMemo(
    () => JSON.stringify({ filename, headers, rows, mapping }),
    [filename, headers, rows, mapping],
  );

  async function handleFile(file: File) {
    setParseError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setParseError(labels.fileEmptyError);
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
      <div className="card">
        {parseError ? <div className="form-error">{parseError}</div> : null}
        {counterparties.length === 0 || palletTypes.length === 0 ? (
          <div className="form-message">{labels.prerequisiteMissing}</div>
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
        <p className="muted" style={{ fontSize: 13 }}>{labels.expectedColumns}</p>
      </div>
    );
  }

  return (
    <div>
      {actionState.error ? <div className="form-error">{actionState.error}</div> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{labels.step1Title} — {filename}</h2>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {MOVEMENT_FIELDS.map((field) => (
            <div className="field" key={field}>
              <label htmlFor={`map-${field}`}>
                {labels.fields[field]}
                {REQUIRED_MOVEMENT_FIELDS.includes(field) ? " *" : ""}
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

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{labels.step2Title}</h2>
        {missing.length > 0 ? (
          <div className="form-error">
            {fillTemplate(labels.missingRequiredFieldsTemplate, {
              fields: missing.map((f) => labels.fields[f]).join(", "),
            })}
          </div>
        ) : (
          <div className="grid kpis" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="kpi-label">{labels.totalRows}</div>
              <div className="kpi-value">{results.length}</div>
            </div>
            <div className="card">
              <div className="kpi-label">{labels.validRows}</div>
              <div className="kpi-value">{validCount}</div>
            </div>
            <div className="card">
              <div className="kpi-label">{labels.invalidRows}</div>
              <div className="kpi-value">{invalidResults.length}</div>
            </div>
          </div>
        )}

        {invalidResults.length > 0 ? (
          <>
            <h3 style={{ fontSize: 14 }}>{labels.invalidRowsTitle}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{labels.rowNumber}</th>
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
          </>
        ) : null}
      </div>

      <form action={formAction}>
        <input type="hidden" name="payload" value={payloadJson} />
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "auto" }}
            onClick={() => setStep("upload")}
          >
            {labels.back}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "auto" }}
            disabled={pending || missing.length > 0 || validCount === 0}
          >
            {pending
              ? labels.importing
              : fillTemplate(labels.confirmImportTemplate, { count: String(validCount) })}
          </button>
        </div>
      </form>
    </div>
  );
}
