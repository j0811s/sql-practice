import { describe, expect, it } from "vitest";
import { tokenizeQuery } from "./tokenizeQuery";

describe("tokenizeQuery", () => {
  it("splits a query into whitespace-separated tokens", () => {
    expect(tokenizeQuery("SELECT id, name, age FROM users WHERE age >= 20;")).toEqual([
      "SELECT",
      "id,",
      "name,",
      "age",
      "FROM",
      "users",
      "WHERE",
      "age",
      ">=",
      "20;",
    ]);
  });

  it("ignores leading/trailing whitespace and collapses repeated spaces", () => {
    expect(tokenizeQuery("  SELECT   1;  ")).toEqual(["SELECT", "1;"]);
  });

  it("rejoins with single spaces back into the original query", () => {
    const sql = "SELECT dept, COUNT(*) FROM users GROUP BY dept HAVING COUNT(*) >= 3;";
    expect(tokenizeQuery(sql).join(" ")).toBe(sql);
  });
});
