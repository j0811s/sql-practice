import { describe, expect, it } from "vitest";
import { parseSchema } from "./parseSchema";

describe("parseSchema", () => {
  it("parses a single CREATE TABLE statement with no spaces after commas", () => {
    const result = parseSchema(["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);"]);

    expect(result).toEqual([
      {
        table: "users",
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "name", type: "TEXT" },
          { name: "age", type: "INTEGER" },
        ],
      },
    ]);
  });

  it("parses multiple CREATE TABLE statements in order", () => {
    const result = parseSchema([
      "CREATE TABLE departments(id INTEGER, name TEXT);",
      "CREATE TABLE users(id INTEGER, name TEXT, age INTEGER, dept_id INTEGER);",
    ]);

    expect(result).toEqual([
      {
        table: "departments",
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "name", type: "TEXT" },
        ],
      },
      {
        table: "users",
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "name", type: "TEXT" },
          { name: "age", type: "INTEGER" },
          { name: "dept_id", type: "INTEGER" },
        ],
      },
    ]);
  });

  it("keeps trailing constraint keywords as part of the column type", () => {
    const result = parseSchema(["CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT);"]);

    expect(result).toEqual([
      {
        table: "users",
        columns: [
          { name: "id", type: "INTEGER PRIMARY KEY" },
          { name: "name", type: "TEXT" },
        ],
      },
    ]);
  });
});
