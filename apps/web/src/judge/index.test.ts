import { describe, expect, it } from "vitest";
import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { judge } from "./index";

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
    answerQuery: "SELECT 1;",
    orderMatters: false,
    ...overrides,
  };
}

describe("judge", () => {
  it("returns true for an exact match", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(judge(actual, problem)).toBe(true);
  });

  it("returns true when column order differs but values match", () => {
    const actual: TableResult = {
      columns: ["name", "id", "age"],
      rows: [
        ["Alice", 1, 22],
        ["Carol", 3, 35],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(judge(actual, problem)).toBe(true);
  });

  it("returns true when row order differs and orderMatters is false", () => {
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
      orderMatters: false,
    });

    expect(judge(actual, problem)).toBe(true);
  });

  it("returns true when row order matches and orderMatters is true", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: true,
    });

    expect(judge(actual, problem)).toBe(true);
  });

  it("returns false when row order differs and orderMatters is true", () => {
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

    expect(judge(actual, problem)).toBe(false);
  });

  it("returns false when a row is missing", () => {
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

    expect(judge(actual, problem)).toBe(false);
  });

  it("returns false when there is an extra row", () => {
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

    expect(judge(actual, problem)).toBe(false);
  });

  it("returns false when a value differs", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 23]],
    };
    const problem = makeProblem({
      expectedResult: [{ id: 1, name: "Alice", age: 22 }],
      orderMatters: false,
    });

    expect(judge(actual, problem)).toBe(false);
  });

  it("returns false when a duplicate expected row is under-counted", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 22]],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 1, name: "Alice", age: 22 },
      ],
      orderMatters: false,
    });

    expect(judge(actual, problem)).toBe(false);
  });

  it("returns true when both results are empty", () => {
    const actual: TableResult = { columns: [], rows: [] };
    const problem = makeProblem({ expectedResult: [], orderMatters: false });

    expect(judge(actual, problem)).toBe(true);
  });
});
