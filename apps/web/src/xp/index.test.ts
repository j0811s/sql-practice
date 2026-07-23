import { describe, expect, it } from "vitest";
import type { Problem } from "@sql-practice/shared";
import { calculateLevel, calculateXp, totalXp } from "./index";

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

describe("calculateXp", () => {
  it("returns difficulty times 10", () => {
    expect(calculateXp(makeProblem({ difficulty: 1 }))).toBe(10);
    expect(calculateXp(makeProblem({ difficulty: 3 }))).toBe(30);
  });
});

describe("calculateLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("returns level 1 for 99 XP", () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it("returns level 2 for 100 XP", () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it("returns level 2 for 199 XP", () => {
    expect(calculateLevel(199)).toBe(2);
  });

  it("returns level 3 for 200 XP", () => {
    expect(calculateLevel(200)).toBe(3);
  });
});

describe("totalXp", () => {
  it("sums XP for completed problems only", () => {
    const problems = [
      makeProblem({ id: 1, difficulty: 1 }),
      makeProblem({ id: 2, difficulty: 3 }),
      makeProblem({ id: 3, difficulty: 5 }),
    ];

    expect(totalXp([1, 3], problems)).toBe(10 + 50);
  });

  it("ignores completed ids that don't match any problem", () => {
    const problems = [makeProblem({ id: 1, difficulty: 1 })];

    expect(totalXp([1, 999], problems)).toBe(10);
  });

  it("returns 0 when nothing is completed", () => {
    const problems = [makeProblem({ id: 1, difficulty: 1 })];

    expect(totalXp([], problems)).toBe(0);
  });
});
