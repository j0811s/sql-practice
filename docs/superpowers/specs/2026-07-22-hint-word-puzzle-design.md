# 段階的ヒント機能（キーワードパズル） 設計書

- 日付: 2026-07-22
- 対象: 既存の「ヒントを見る」の先に、正解クエリを単語単位にバラしたボタン（クリックでターミナルに埋め込み）を追加する

## 背景・目的

現在の`apps/web`のヒントは「ヒントを見る」ボタンを押すと`problem.hint`（1〜2文のテキスト）が表示されるだけの1段階構成（`apps/web/src/App.tsx`の`hintShown`）。これはテキストで方針を示すだけで、実際にSQLを書く手がかりにはならない。

この設計は、ヒントテキスト表示の後にもう一段階「もっとヒントを見る」を追加し、押すと正解クエリを空白区切りの単語にバラしてシャッフルしたボタン群を表示、各ボタンを押すとその単語がターミナルの入力行に追記される、というところまでを対象とする。

## スコープ

### 対象

- `packages/shared/src/types.ts` — `Problem`に`answerQuery: string`を追加
- `packages/shared/src/parseProblem.ts` — `answerQuery`のバリデーション追加
- `packages/problems/**/*.json`（15問全て） — `answerQuery`フィールドを追加
- `apps/web/src/hint/tokenizeQuery.ts`（新規） — 空白区切りでトークン化する純粋関数
- `apps/web/src/hint/shuffle.ts`（新規） — Fisher–Yatesシャッフルの純粋関数（乱数源を注入可能にしテスト容易性を確保）
- `apps/web/src/hint/HintWordPuzzle.tsx`（新規） — シャッフル済み単語ボタン群を表示するコンポーネント
- `apps/web/src/terminal/TerminalView.tsx` — `forwardRef`化し、`insertText(text: string)`を`useImperativeHandle`で公開
- `apps/web/src/App.tsx` — `wordHintShown` state、`terminalRef`、`HintWordPuzzle`の組み込み
- `apps/web/src/index.css` — 単語パズル用のスタイル追加
- `e2e/sql-execution.spec.ts` — ヒント2段階＋単語ボタンのクリックからターミナルへの反映を検証するテストを追加

### 対象外（後続タスク）

- ターミナルのbackspaceと単語ボタンの使用済み状態を同期させること（既知の制約として許容する。後述）
- SQLの構文を意識した高度なトークン化（カンマ・演算子・文字列リテラルを個別トークンに分割するなど）。空白区切りで十分と判断
- ヒントを見た場合のXP減点などのペナルティ設計（現状ヒントにペナルティはなく、今回もスコープ外）

## データモデルの変更

`Problem`に`answerQuery: string`（そのまま実行すれば正解になる、正準の1本のSQL文）を追加する。

```ts
export interface Problem {
  id: number;
  title: string;
  difficulty: number;
  category: string;
  question: string;
  schema: string[];
  seed: string[];
  expectedResult: Record<string, unknown>[];
  hint: string[];
  answerQuery: string;
  orderMatters: boolean;
}
```

`parseProblem`に`if (typeof candidate.answerQuery !== "string") throw new Error("Problem.answerQuery must be a string");`を追加する。

### 15問分の`answerQuery`（実PGliteで`judge()`が`true`を返すことを検証済み）

| id | category | answerQuery |
| -- | -------- | ----------- |
| 1 | WHERE | `SELECT id, name, age FROM users WHERE age >= 20;` |
| 2 | WHERE | `SELECT id, name, age, dept FROM users WHERE dept = 'Engineering';` |
| 3 | WHERE | `SELECT id, name, age, dept FROM users WHERE age < 30;` |
| 4 | ORDERBY | `SELECT id, name, age, dept FROM users ORDER BY age ASC;` |
| 5 | ORDERBY | `SELECT id, name, age, dept FROM users ORDER BY age DESC;` |
| 6 | GROUPBY | `SELECT dept, COUNT(*) FROM users GROUP BY dept;` |
| 7 | GROUPBY | `SELECT dept, SUM(age) FROM users GROUP BY dept;` |
| 8 | JOIN | `SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id;` |
| 9 | JOIN | `SELECT users.name FROM users JOIN departments ON users.dept_id = departments.id WHERE departments.name = 'Marketing';` |
| 10 | WHERE | `SELECT id, name, age, dept FROM users WHERE dept IN ('Sales', 'Marketing');` |
| 11 | ORDERBY | `SELECT id, name, age, dept FROM users ORDER BY age DESC LIMIT 3;` |
| 12 | ORDERBY | `SELECT id, name, age, dept FROM users ORDER BY dept ASC, age DESC;` |
| 13 | GROUPBY | `SELECT dept, COUNT(*) FROM users GROUP BY dept HAVING COUNT(*) >= 3;` |
| 14 | GROUPBY | `SELECT dept, MAX(age) FROM users GROUP BY dept;` |
| 15 | JOIN | `SELECT users.name, departments.name FROM users LEFT JOIN departments ON users.dept_id = departments.id;` |

## トークン化・シャッフル（純粋関数）

`apps/web/src/hint/tokenizeQuery.ts`:

```ts
export function tokenizeQuery(sql: string): string[] {
  return sql.trim().split(/\s+/);
}
```

空白区切りのため、句読点（カンマ・`;`・`>=`など）は隣接する単語にくっついたまま1トークンになる（例: `"id,"` `"age"` `">="` `"20;"`）。トークンを単一スペースで`join(" ")`すれば元の`answerQuery`と一致する。SQLを構文的に解析する必要はない。

`apps/web/src/hint/shuffle.ts`:

```ts
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

`random`を注入可能にすることで、固定シーケンスを渡した決定論的なユニットテストが書ける。

シャッフルは「もっとヒントを見る」を押した瞬間に1回だけ行い（`useMemo`ではなく、クリック時に`useState`へ格納）、以降は同じ問題を見ている間再シャッフルしない。

## パズルUI: `HintWordPuzzle`

```tsx
interface HintWordPuzzleProps {
  words: string[]; // シャッフル済み
  onInsert: (word: string) => void;
}

export function HintWordPuzzle({ words, onInsert }: HintWordPuzzleProps) {
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  return (
    <div className="hint-puzzle">
      <div className="hint-puzzle__words">
        {words.map((word, i) => (
          <button
            key={i}
            type="button"
            className="hint-word"
            disabled={usedIndices.has(i)}
            onClick={() => {
              onInsert(word);
              setUsedIndices((prev) => new Set(prev).add(i));
            }}
          >
            {word}
          </button>
        ))}
      </div>
      {usedIndices.size > 0 && (
        <button type="button" className="hint-puzzle__reset" onClick={() => setUsedIndices(new Set())}>
          リセット
        </button>
      )}
    </div>
  );
}
```

- 同じ単語が複数回登場する場合（例: `age`が2回）もそれぞれ独立したボタンになる（トークン配列のインデックスで管理するため）。
- クリックしたボタンは即座に`disabled`になり、二重挿入を防ぐ。
- 「リセット」はボタンの使用済み状態だけを戻す。ターミナルの入力行はユーザーが手動でbackspaceして消す必要があり、両者は連動しない（既知の制約。バックスペース1文字とトークン単位の対応を追跡するのは複雑さに見合わないと判断）。

## `TerminalView`のref API化

`TerminalView`を`forwardRef`にし、既存の`paste`イベント（`reduceLineBuffer`に元々ある「任意のテキストをバッファ末尾に追記してそのままエコーする」処理）を再利用して`insertText`を実装する。`lineBuffer.ts`自体の変更は不要。

```tsx
export interface TerminalViewHandle {
  insertText: (text: string) => void;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { onSubmit },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ...(既存のterm生成・onDataまでは変更なし)

    let buffer = "";
    // ...

    const applyEvent = (event: LineBufferEvent) => {
      const result = reduceLineBuffer(buffer, event);
      buffer = result.buffer;
      term.write(result.echo);
      return result;
    };

    const disposable = term.onData((data) => {
      const event = toLineBufferEvent(data);
      if (!event) return;
      // ...history-prev/nextの分岐はそのまま...
      const result = applyEvent(event);
      // ...submittedLine処理はそのまま...
    });

    imperativeRef.current = {
      insertText: (text) => {
        applyEvent({ type: "paste", text });
        term.focus();
      },
    };

    // ...cleanup...
  }, [onSubmit]);

  useImperativeHandle(ref, () => ({
    insertText: (text) => imperativeRef.current?.insertText(text),
  }));

  return <div ref={containerRef} className="terminal-surface" />;
});
```

（`imperativeRef`は`useEffect`の外からも安定して呼べるよう、`useRef`でeffect内の関数を保持する橋渡し。実装時にPlan側で具体的なコードに落とす。）

`onData`ハンドラ内の「event適用→buffer更新→echo書き込み」ロジックを`applyEvent`に切り出し、`insertText`と共有する。history-prev/nextの分岐（バッファを書き換えない特殊系）は`onData`側にだけ残る。

## App.tsxの変更

- `wordHintShown: boolean` stateを追加。問題切り替え時に`hintShown`と同様`false`にリセットする。
- `terminalRef = useRef<TerminalViewHandle>(null)`を追加し、`<TerminalView ref={terminalRef} onSubmit={handleSubmit} />`とする。
- ヒントセクションの表示を3段階にする:
  1. `!hintShown` → 「ヒントを見る」ボタン（既存のまま）
  2. `hintShown && !wordHintShown` → ヒントテキスト表示 + 「もっとヒントを見る」ボタン
  3. `wordHintShown` → ヒントテキスト表示 + `HintWordPuzzle`（`tokenizeQuery(problem.answerQuery)`を`shuffle`した配列を渡す。シャッフル結果は`wordHintShown`をtrueにするタイミングで`useState`に保存し、以後固定する）
- `HintWordPuzzle`の`onInsert`は`(word) => terminalRef.current?.insertText(word + " ")`。

## CSS

`.hint-word`は既存の`.hint-reveal`と同系統のトークン（`var(--key)` / `var(--key-soft)`）を使った小さめのピル型ボタンとして、`.hint-puzzle__words`内に`flex-wrap`で並べる。`disabled`状態は不透明度を下げてクリック不可を示す。`.hint-puzzle__reset`はテキストリンク調の控えめな見た目にする。

## テスト計画

- `apps/web/src/hint/tokenizeQuery.test.ts` — 空白区切り・前後trim・joinで元に戻ることを確認
- `apps/web/src/hint/shuffle.test.ts` — 注入した`random`で並び順が決定論的に検証できること、要素の集合が変わらないことを確認
- `packages/shared/src/parseProblem.test.ts` — `answerQuery`が文字列でない場合にエラーになることを追加
- `packages/problems/**/*.test.ts`（15ファイル） — 既存の`id`/`category`検証に加え、`answerQuery`が空でない文字列であることを確認
- `e2e/sql-execution.spec.ts` — 新規テストを追加: 「ヒントを見る」→「もっとヒントを見る」の2段階を開き、単語ボタンをクリックしてターミナルに反映されること、正しい順でクリックしきってEnterすれば正解判定になることを検証する
- 実装後、`verify-web-ui`スキルで光/暗/モバイル幅のスクリーンショット確認を行う（ヒントパズルの見た目を目視確認するため）
- `TerminalView`のref APIはコンポーネント単体テストを追加しない（本プロジェクトの既存方針どおり、DOM挙動はPlaywright E2Eでのみ検証する）
