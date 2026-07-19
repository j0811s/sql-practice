import { useCallback, useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { judge } from "./judge";
import { generateReview } from "./review";
import { TerminalView } from "./terminal/TerminalView";
import { calculateLevel, totalXp } from "./xp";

const problem = problems[0];
const COMPLETED_STORAGE_KEY = "sql-practice:completed-problems";

function loadCompletedIds(): number[] {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>(loadCompletedIds);

  useEffect(() => {
    let cancelled = false;
    void createDb().then(async (instance) => {
      for (const statement of [...problem.schema, ...problem.seed]) {
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
        const tableResult = await runQuery(db, sql);
        const isCorrect = judge(tableResult, problem);
        setResult(tableResult);
        setCorrect(isCorrect);
        setReview(isCorrect ? null : generateReview(tableResult, problem));

        if (isCorrect) {
          const current = loadCompletedIds();
          if (!current.includes(problem.id)) {
            const next = [...current, problem.id];
            localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(next));
            setCompletedIds(next);
          }
        }
      } catch (err) {
        setResult(null);
        setCorrect(null);
        setReview(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [db],
  );

  const xp = totalXp(completedIds, problems);
  const level = calculateLevel(xp);

  return (
    <main>
      <h1>SQL Practice</h1>
      <p data-testid="xp-status">
        Lv.{level} ({xp} XP)
      </p>
      <p>{problem.question}</p>
      {db ? <TerminalView onSubmit={handleSubmit} /> : <p>データベースを初期化しています…</p>}
      {error && <p role="alert">{error}</p>}
      {correct !== null && (
        <p data-testid="judge-result">
          {correct ? "○ 正解です！" : "× 不正解です。もう一度考えてみましょう"}
        </p>
      )}
      {review && <p data-testid="review">{review}</p>}
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
