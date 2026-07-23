import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { HintWordPuzzle } from "./hint/HintWordPuzzle";
import { shuffle } from "./hint/shuffle";
import { tokenizeQuery } from "./hint/tokenizeQuery";
import { judge } from "./judge";
import { ProblemList } from "./problem-list/ProblemList";
import { generateReview } from "./review";
import { parseSchema } from "./schema/parseSchema";
import { SchemaView } from "./schema/SchemaView";
import { TerminalView } from "./terminal/TerminalView";
import type { TerminalViewHandle } from "./terminal/TerminalView";
import { calculateLevel, totalXp } from "./xp";

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
  const [selectedProblemId, setSelectedProblemId] = useState<number>(problems[0].id);
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>(loadCompletedIds);
  const [hintShown, setHintShown] = useState(false);
  const [wordHintWords, setWordHintWords] = useState<string[] | null>(null);
  const terminalRef = useRef<TerminalViewHandle>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const problem = problems.find((p) => p.id === selectedProblemId) ?? problems[0];
  const tables = useMemo(() => parseSchema(problem.schema), [problem]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    setDb(null);
    setResult(null);
    setError(null);
    setCorrect(null);
    setReview(null);
    setHintShown(false);
    setWordHintWords(null);

    void createDb().then(async (instance) => {
      for (const statement of [...problem.schema, ...problem.seed]) {
        await instance.exec(statement);
      }
      if (cancelled) {
        void instance.close();
        return;
      }
      setDb(instance);
    });

    return () => {
      cancelled = true;
    };
  }, [problem]);

  useEffect(() => {
    if (!db) return;
    return () => {
      void db.close();
    };
  }, [db]);

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
    [db, problem],
  );

  const xp = totalXp(completedIds, problems);
  const level = calculateLevel(xp);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__left">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="problem-panel"
            aria-label={mobileMenuOpen ? "問題一覧を閉じる" : "問題一覧を開く"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            ≡
          </button>
          <h1 className="wordmark">
            SQL_<em>PRACTICE</em>
          </h1>
        </div>
        <p className="status-readout" data-testid="xp-status">
          Lv.<strong>{level}</strong> ({xp} XP)
        </p>
      </header>
      <div className="workbench">
        {mobileMenuOpen && <div className="menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
        <aside id="problem-panel" className={`sidebar${mobileMenuOpen ? " is-open" : ""}`}>
          <p className="sidebar-heading">
            PROBLEMS <span className="count">{problems.length}</span>
          </p>
          <ProblemList
            problems={problems}
            selectedId={selectedProblemId}
            completedIds={completedIds}
            onSelect={(id) => {
              setSelectedProblemId(id);
              setMobileMenuOpen(false);
            }}
          />
        </aside>
        <main className="console">
          <div className="problem-brief">
            <span className="problem-code">Q{String(problem.id).padStart(2, "0")}</span>
            <p className="question">{problem.question}</p>
          </div>

          <section className="schema-section">
            <p className="panel-label">SCHEMA</p>
            <SchemaView tables={tables} />
          </section>

          {problem.hint.length > 0 && (
            <section className="hint-section">
              {hintShown ? (
                <>
                  <p className="panel-label">HINT</p>
                  <p className="hint-text" data-testid="hint-text">
                    {problem.hint.join(" ")}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="hint-reveal"
                  data-testid="hint-reveal"
                  onClick={() => setHintShown(true)}
                >
                  ヒントを見る
                </button>
              )}
            </section>
          )}

          {hintShown && (
            <section className="hint-more-section">
              {wordHintWords ? (
                <HintWordPuzzle
                  words={wordHintWords}
                  onInsert={(word) => terminalRef.current?.insertText(`${word} `)}
                />
              ) : (
                <button
                  type="button"
                  className="hint-reveal"
                  data-testid="hint-more-reveal"
                  onClick={() => setWordHintWords(shuffle(tokenizeQuery(problem.answerQuery)))}
                >
                  もっとヒントを見る
                </button>
              )}
            </section>
          )}

          <section className="terminal-panel">
            <div className="terminal-panel__bar">schema: problem_{problem.id}</div>
            {db ? (
              <TerminalView ref={terminalRef} onSubmit={handleSubmit} />
            ) : (
              <p className="loading">データベースを初期化しています…</p>
            )}
          </section>

          {error && (
            <p role="alert" className="banner banner--error">
              {error}
            </p>
          )}
          {correct !== null && (
            <p data-testid="judge-result" className={`verdict ${correct ? "verdict--ok" : "verdict--err"}`}>
              {correct ? "○ 正解です！" : "× 不正解です。もう一度考えてみましょう"}
            </p>
          )}
          {review && (
            <p data-testid="review" className="review">
              {review}
            </p>
          )}
          {result && (
            <section className="result">
              <p className="panel-label">RESULT</p>
              <div className="result__scroll">
                <table data-testid="result-table">
                  <thead>
                    <tr>
                      <th className="gutter">#</th>
                      {result.columns.map((column, i) => (
                        <th key={i}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="gutter">{i + 1}</td>
                        {row.map((cell, j) => (
                          <td key={j}>{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="result__caption">({result.rows.length} rows)</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
