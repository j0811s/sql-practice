import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(15);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it("includes the original WHERE problem", () => {
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("includes the new WHERE problems", () => {
    expect(problems.find((p) => p.id === 2)).toMatchObject({ id: 2, category: "WHERE" });
    expect(problems.find((p) => p.id === 3)).toMatchObject({ id: 3, category: "WHERE" });
    expect(problems.find((p) => p.id === 10)).toMatchObject({ id: 10, category: "WHERE" });
  });

  it("includes the ORDERBY problems", () => {
    expect(problems.find((p) => p.id === 4)).toMatchObject({ id: 4, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 5)).toMatchObject({ id: 5, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 11)).toMatchObject({ id: 11, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 12)).toMatchObject({ id: 12, category: "ORDERBY" });
  });

  it("includes the GROUPBY problems", () => {
    expect(problems.find((p) => p.id === 6)).toMatchObject({ id: 6, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 7)).toMatchObject({ id: 7, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 13)).toMatchObject({ id: 13, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 14)).toMatchObject({ id: 14, category: "GROUPBY" });
  });

  it("includes the JOIN problems", () => {
    expect(problems.find((p) => p.id === 8)).toMatchObject({ id: 8, category: "JOIN" });
    expect(problems.find((p) => p.id === 9)).toMatchObject({ id: 9, category: "JOIN" });
    expect(problems.find((p) => p.id === 15)).toMatchObject({ id: 15, category: "JOIN" });
  });
});
