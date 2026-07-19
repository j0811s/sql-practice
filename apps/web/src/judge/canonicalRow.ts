export function canonicalRow(values: unknown[]): string {
  return values
    .map((v) => JSON.stringify(v))
    .sort()
    .join(" ");
}
