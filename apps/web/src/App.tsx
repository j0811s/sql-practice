import { useCallback, useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { TerminalView } from "./terminal/TerminalView";

const SEED_SQL = [
  "CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);",
  "INSERT INTO users VALUES(1,'Alice',22);",
  "INSERT INTO users VALUES(2,'Bob',18);",
  "INSERT INTO users VALUES(3,'Carol',35);",
];

function App() {
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createDb().then(async (instance) => {
      for (const statement of SEED_SQL) {
        await instance.exec(statement);
      }
      if (!cancelled) setDb(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (sql: string) => {
      if (!db || sql.trim() === "") return;
      try {
        setError(null);
        setResult(await runQuery(db, sql));
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [db],
  );

  return (
    <main>
      <h1>SQL Practice</h1>
      <p>usersテーブルにSELECT文を入力してEnterで実行してください。</p>
      <TerminalView onSubmit={handleSubmit} />
      {error && <p role="alert">{error}</p>}
      {result && (
        <table data-testid="result-table">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default App;
