import { describe, expect, it } from "vitest";
import { toTableResult } from "./queryResult";

describe("toTableResult", () => {
  it("converts field/row arrays into a column-ordered table", () => {
    const result = toTableResult({
      fields: [{ name: "id" }, { name: "name" }, { name: "age" }],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });

    expect(result).toEqual({
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });
  });

  it("preserves both values when two columns share the same name", () => {
    const result = toTableResult({
      fields: [{ name: "name" }, { name: "name" }],
      rows: [["Alice", "Sales"]],
    });

    expect(result).toEqual({
      columns: ["name", "name"],
      rows: [["Alice", "Sales"]],
    });
  });
});
