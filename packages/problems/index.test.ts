import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(9);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("includes the original WHERE problem", () => {
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("includes the new WHERE problems", () => {
    expect(problems.find((p) => p.id === 2)).toMatchObject({ id: 2, category: "WHERE" });
    expect(problems.find((p) => p.id === 3)).toMatchObject({ id: 3, category: "WHERE" });
  });

  it("includes the ORDERBY problems", () => {
    expect(problems.find((p) => p.id === 4)).toMatchObject({ id: 4, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 5)).toMatchObject({ id: 5, category: "ORDERBY" });
  });

  it("includes the GROUPBY problems", () => {
    expect(problems.find((p) => p.id === 6)).toMatchObject({ id: 6, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 7)).toMatchObject({ id: 7, category: "GROUPBY" });
  });

  it("includes the JOIN problems", () => {
    expect(problems.find((p) => p.id === 8)).toMatchObject({ id: 8, category: "JOIN" });
    expect(problems.find((p) => p.id === 9)).toMatchObject({ id: 9, category: "JOIN" });
  });
});
