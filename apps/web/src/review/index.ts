import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { canonicalRow } from "../judge/canonicalRow";

function countBy(rows: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row, (counts.get(row) ?? 0) + 1);
  }
  return counts;
}

function multisetDiff(actual: string[], expected: string[]): { extra: number; missing: number } {
  const actualCounts = countBy(actual);
  const expectedCounts = countBy(expected);
  const keys = new Set([...actualCounts.keys(), ...expectedCounts.keys()]);

  let extra = 0;
  let missing = 0;
  for (const key of keys) {
    const a = actualCounts.get(key) ?? 0;
    const e = expectedCounts.get(key) ?? 0;
    if (a > e) extra += a - e;
    if (e > a) missing += e - a;
  }
  return { extra, missing };
}

export function generateReview(actual: TableResult, problem: Problem): string {
  const expectedColumnCount = problem.expectedResult[0]
    ? Object.keys(problem.expectedResult[0]).length
    : 0;

  if (expectedColumnCount > 0 && actual.columns.length !== expectedColumnCount) {
    return "SELECTする列の数を確認しましょう";
  }

  const actualRows = actual.rows.map(canonicalRow);
  const expectedRows = problem.expectedResult.map((row) => canonicalRow(Object.values(row)));
  const { extra, missing } = multisetDiff(actualRows, expectedRows);

  if (problem.orderMatters && extra === 0 && missing === 0) {
    return "ORDER BYを確認しましょう";
  }
  if (extra > 0 && missing === 0) {
    return "抽出条件が緩すぎるかもしれません。WHERE句の条件を見直しましょう";
  }
  if (missing > 0 && extra === 0) {
    return "抽出条件が厳しすぎるかもしれません。比較演算子や条件を見直しましょう";
  }
  return "結果の値を見直しましょう";
}
