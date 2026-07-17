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
});
