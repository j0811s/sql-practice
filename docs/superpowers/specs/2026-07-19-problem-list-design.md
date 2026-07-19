# 複数問題選択UI 設計書

- 日付: 2026-07-19
- 対象: 問題一覧を常時表示し、クリックで問題を切り替えられるようにする（`docs/superpowers/specs/2026-07-19-xp-system-design.md` の後続）

## 背景・目的

`App.tsx` は現在 `problems[0]`（問題001）に固定されており、問題を切り替える手段がない。この設計は、問題一覧をサイドバー的に常時表示し、クリックで問題を切り替えられるようにするところまでを対象とする。

問題一覧の視覚的なデザイン調整、複数問題を前提とした切り替えの網羅的なE2E検証（現状問題データが1件のみのため）、カテゴリ別フィルタ・検索機能は対象外（後続タスク）。

## スコープ

### 対象

- `apps/web/src/problem-list/ProblemList.tsx`（新規） — 問題一覧コンポーネント
- `apps/web/src/App.tsx` — `selectedProblemId` stateの導入、問題切り替え時のDB再生成・状態リセット、`ProblemList`の組み込み
- `e2e/sql-execution.spec.ts` — 問題一覧の表示・選択状態の確認テストを追加

### 対象外（後続タスク）

- 問題一覧の視覚的なデザイン調整（CSS）
- 複数問題を前提とした切り替えの網羅的なE2E検証（問題データ拡充後に追加）
- カテゴリ別フィルタ・検索機能

## `ProblemList` コンポーネント

`apps/web/src/problem-list/ProblemList.tsx` を新設する。問題一覧をボタンのリストとして表示し、選択中は `aria-current`、正解済みは `✓` マークを表示する。既存方針を継続し、Reactコンポーネント単体テストは追加せず、Playwright E2Eで画面全体の振る舞いを検証する。

```tsx
import type { Problem } from "@sql-practice/shared";

interface ProblemListProps {
  problems: Problem[];
  selectedId: number;
  completedIds: number[];
  onSelect: (id: number) => void;
}

export function ProblemList({ problems, selectedId, completedIds, onSelect }: ProblemListProps) {
  return (
    <ul data-testid="problem-list">
      {problems.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            aria-current={p.id === selectedId}
            data-testid={`problem-item-${p.id}`}
          >
            {completedIds.includes(p.id) ? "✓ " : ""}
            {p.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## App.tsx の変更

- モジュールレベルの `const problem = problems[0]` を廃止し、`selectedProblemId: number` stateを導入する（初期値: `problems[0].id`）。
- `const problem = problems.find((p) => p.id === selectedProblemId) ?? problems[0];` で都度導出する。
- DB初期化の `useEffect` は `[problem]` に依存させる（`problems` 配列自体と `selectedProblemId` が変わらない限り `problem` の参照は安定するため、無限ループにはならない）。切り替え時は `result`・`error`・`correct`・`review` の各stateもリセットする。
- 古いPGliteインスタンスは、`db` stateの変化を監視する別の `useEffect` のクリーンアップで `close()` する。生成用エフェクトとは分離することで、タイミングを単純に保つ（`db` が新しい値に置き換わる直前に必ず前の値のクリーンアップが走るというReactの規則をそのまま利用する）。

```tsx
const [selectedProblemId, setSelectedProblemId] = useState<number>(problems[0].id);
const problem = problems.find((p) => p.id === selectedProblemId) ?? problems[0];

useEffect(() => {
  let cancelled = false;
  setDb(null);
  setResult(null);
  setError(null);
  setCorrect(null);
  setReview(null);

  void createDb().then(async (instance) => {
    for (const statement of [...problem.schema, ...problem.seed]) {
      await instance.exec(statement);
    }
    if (!cancelled) setDb(instance);
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
```

既存の `{db ? <TerminalView .../> : <p>初期化中…</p>}` という分岐により、問題切り替え時にターミナルも自然に再生成されクリーンな状態になる。`handleSubmit` の依存配列は `[db, problem]` にする（`db` は問題切り替え時に必ず変わるため実質的には安全だが、明示性のため `problem` も加える）。

`ProblemList` は `<main>` 内、`<h1>` の直後に配置する:

```tsx
<ProblemList
  problems={problems}
  selectedId={selectedProblemId}
  completedIds={completedIds}
  onSelect={setSelectedProblemId}
/>
```

XP・レベル表示は既存通り、全問題共通の値を継続表示する（変更なし）。

## テスト計画

`e2e/sql-execution.spec.ts` に、問題一覧が表示され現在選択中の問題（問題001）が正しく強調されていることを確認するテストを追加する（`page.getByTestId("problem-list")` の可視性、`page.getByTestId("problem-item-1")` の `aria-current` 属性を確認する）。

問題データが1件のみの現状では、実際に問題を切り替える動作（DBの作り直し、正解済みマークの表示更新）を意味のある形でE2E検証できないため、今回はここまでとする。
