import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("orderby/002.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./002.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(5);
    expect(problem.category).toBe("ORDERBY");
  });
});
