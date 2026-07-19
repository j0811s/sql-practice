import { describe, expect, it } from "vitest";
import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { generateReview } from "./index";

function makeProblem(overrides: Partial<Problem>): Problem {
  return {
    id: 1,
    title: "test",
    difficulty: 1,
    category: "WHERE",
    question: "test",
    schema: [],
    seed: [],
    expectedResult: [],
    hint: [],
    orderMatters: false,
    ...overrides,
  };
}

describe("generateReview", () => {
  it("returns the column-count message when actual has a different number of columns", () => {
    const actual: TableResult = {
      columns: ["id", "name"],
      rows: [[1, "Alice"]],
    };
    const problem = makeProblem({
      expectedResult: [{ id: 1, name: "Alice", age: 22 }],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("SELECTする列の数を確認しましょう");
  });

  it("returns the ORDER BY message when values match but order is wrong", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [3, "Carol", 35],
        [1, "Alice", 22],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: true,
    });

    expect(generateReview(actual, problem)).toBe("ORDER BYを確認しましょう");
  });

  it("returns the too-many-rows message when there are extra rows", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
        [2, "Bob", 18],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe(
      "抽出条件が緩すぎるかもしれません。WHERE句の条件を見直しましょう",
    );
  });

  it("returns the too-few-rows message when a row is missing", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 22]],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe(
      "抽出条件が厳しすぎるかもしれません。比較演算子や条件を見直しましょう",
    );
  });

  it("returns the generic values message when a value differs", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 23]],
    };
    const problem = makeProblem({
      expectedResult: [{ id: 1, name: "Alice", age: 22 }],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("結果の値を見直しましょう");
  });

  it("returns the generic values message when both extra and missing rows exist", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [2, "Bob", 18],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("結果の値を見直しましょう");
  });
});
