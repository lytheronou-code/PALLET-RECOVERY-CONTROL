export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

// Minimal RFC4180-ish CSV parser: handles quoted fields (with embedded
// commas/semicolons/newlines) and "" as an escaped quote. Auto-detects
// comma vs semicolon delimiter from the header line, since European/Excel
// exports commonly use semicolons.
export function parseCsv(text: string): ParsedCsv {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^﻿/, "");
  const delimiter = detectDelimiter(normalized);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < normalized.length) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const [headerRow, ...dataRows] = nonEmptyRows;

  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: dataRows,
  };
}

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split("\n", 1)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}
