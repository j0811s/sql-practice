import { describe, expect, it } from "vitest";
import { createDb, runQuery } from "./pglite";

describe("runQuery", () => {
  it("executes SQL against a real PGlite instance and returns table rows", async () => {
    const db = await createDb();
    await db.exec("CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);");
    await db.exec("INSERT INTO users VALUES(1,'Alice',22);");
    await db.exec("INSERT INTO users VALUES(2,'Bob',18);");
    await db.exec("INSERT INTO users VALUES(3,'Carol',35);");

    const result = await runQuery(db, "SELECT id, name, age FROM users WHERE age >= 20;");

    expect(result).toEqual({
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });
  });

  it("preserves distinct values when two selected columns share the same name", async () => {
    const db = await createDb();
    await db.exec("CREATE TABLE departments(id INTEGER, name TEXT);");
    await db.exec("CREATE TABLE users(id INTEGER, name TEXT, dept_id INTEGER);");
    await db.exec("INSERT INTO departments VALUES(1,'Sales');");
    await db.exec("INSERT INTO users VALUES(1,'Alice',1);");

    const result = await runQuery(
      db,
      "SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id;",
    );

    expect(result).toEqual({
      columns: ["name", "name"],
      rows: [["Alice", "Sales"]],
    });
  });
});
