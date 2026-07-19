import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { canonicalRow } from "./canonicalRow";

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

export function judge(actual: TableResult, problem: Problem): boolean {
  const actualRows = actual.rows.map(canonicalRow);
  const expectedRows = problem.expectedResult.map((row) => canonicalRow(Object.values(row)));

  if (problem.orderMatters) {
    return (
      actualRows.length === expectedRows.length &&
      actualRows.every((row, i) => row === expectedRows[i])
    );
  }

  return multisetEqual(actualRows, expectedRows);
}
