import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/004.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./004.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(10);
    expect(problem.category).toBe("WHERE");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
