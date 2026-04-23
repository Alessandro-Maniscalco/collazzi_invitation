import { parse } from "csv-parse/sync";

export interface CsvPartyRow {
  label: string;
  email?: string;
  phone?: string;
  guests: string[];
  tags: string[];
  notes?: string;
}

export function parsePartyCsv(input: string): CsvPartyRow[] {
  const rows = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  return rows.map((row) => ({
    label: row.label,
    email: row.email || undefined,
    phone: row.phone || undefined,
    guests: splitList(row.guests),
    tags: splitList(row.tags),
    notes: row.notes || undefined,
  }));
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}
