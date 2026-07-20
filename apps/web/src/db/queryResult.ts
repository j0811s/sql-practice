export interface TableResult {
  columns: string[];
  rows: unknown[][];
}

interface RawQueryResult {
  fields: { name: string }[];
  rows: unknown[][];
}

export function toTableResult(result: RawQueryResult): TableResult {
  const columns = result.fields.map((field) => field.name);
  return { columns, rows: result.rows };
}
