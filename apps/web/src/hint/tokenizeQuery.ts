export function tokenizeQuery(sql: string): string[] {
  return sql.trim().split(/\s+/);
}
