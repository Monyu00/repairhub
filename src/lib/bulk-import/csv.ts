type CsvCell = string;
type CsvRow = CsvCell[];

export function stringifyCsv(headers: readonly string[], rows: ReadonlyArray<object>): string {
  const quoteCell = (value: unknown) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    headers.map(quoteCell).join(","),
    ...rows.map((row) => {
      const record = row as Record<string, unknown>;
      return headers.map((header) => quoteCell(record[header])).join(",");
    }),
  ].join("\r\n");
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row, index) => {
      const record: Record<string, string> = {};
      headers.forEach((header, column) => {
        if (header) record[header] = (row[column] ?? "").trim();
      });
      record.__csvRow = String(index + 2);
      return record;
    });
}

function parseCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: CsvRow = [];
  let cell = "";
  let quoted = false;

  const appendCell = () => {
    row.push(cell);
    cell = "";
  };
  const appendRow = () => {
    appendCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      appendCell();
    } else if (char === "\r" && text[index + 1] === "\n") {
      appendRow();
      index += 1;
    } else if (char === "\n" || char === "\r") {
      appendRow();
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) appendRow();
  return rows.filter((parsedRow) => parsedRow.length > 1 || parsedRow[0]?.trim() !== "");
}
