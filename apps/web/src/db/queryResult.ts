export interface TableResult {
  columns: string[];
  rows: unknown[][];
}

interface RawQueryResult {
  fields: { name: string }[];
  rows: Record<string, unknown>[];
}

export function toTableResult(result: RawQueryResult): TableResult {
  const columns = result.fields.map((field) => field.name);
  const rows = result.rows.map((row) => columns.map((column) => row[column]));
  return { columns, rows };
}
