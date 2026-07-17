import { PGlite } from "@electric-sql/pglite";
import { toTableResult, type TableResult } from "./queryResult";

export async function createDb(): Promise<PGlite> {
  return new PGlite();
}

export async function runQuery(db: PGlite, sql: string): Promise<TableResult> {
  const result = await db.query<Record<string, unknown>>(sql);
  return toTableResult(result);
}
