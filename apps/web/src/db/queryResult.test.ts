import { describe, expect, it } from "vitest";
import { toTableResult } from "./queryResult";

describe("toTableResult", () => {
  it("converts field/row objects into a column-ordered table", () => {
    const result = toTableResult({
      fields: [{ name: "id" }, { name: "name" }, { name: "age" }],
      rows: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
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
});
