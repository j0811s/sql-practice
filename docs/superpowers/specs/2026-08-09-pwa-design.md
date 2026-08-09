# PWA化 設計書

- 日付: 2026-08-09
- 対象: `apps/web`をインストール可能・オフライン動作可能なPWA（Progressive Web App）にする

## 背景・目的

`apps/web`は現状、SQL実行（PGlite = WASM上のPostgres）も問題データ（`@sql-practice/problems`をビルド時に静的import）も完全にクライアント完結しており、実行時に外部やAPIへ`fetch`する箇所は存在しない（確認済み）。一方でビルド成果物は約18MB（`pglite-*.wasm` 約10MB、`pglite-*.data` 約6.3MB、JSバンドル約1.2MBなど）あり、初回アクセス時のダウンロードコストが大きい。

この技術的性質（バックエンド非依存＋大きめの静的資産）はPWA化、特にオフラインキャッシュと非常に相性が良い。今回は次の3点を目的とする。

1. ネットワーク接続なしでもアプリを起動・利用できるようにする（オフライン対応）
2. ホーム画面/ OSのアプリ一覧からアイコン付きで起動できるようにする（インストール可能にする）
3. 2回目以降の起動を高速化する（Service Workerによる明示的なキャッシュ制御）

## スコープ

### 対象

- `apps/web/package.json` — `vite-plugin-pwa`を追加
- `apps/web/vite.config.ts` — `VitePWA()`プラグイン設定（manifest定義、Workbox設定、`devOptions`）
- `apps/web/public/icons/`（新規） — `icon-192.png` / `icon-512.png` / `icon-maskable-192.png` / `icon-maskable-512.png` / `apple-touch-icon.png`
- `apps/web/index.html` — `apple-touch-icon`のlinkタグを追加（manifest本体・theme-colorのlinkタグ・meta挿入はプラグインが自動で行う）
- `apps/web/src/vite-env.d.ts`（新規） — `vite-plugin-pwa/react`の型参照
- `apps/web/src/pwa/UpdateBanner.tsx`（新規） — 更新通知バナー
- `apps/web/src/App.tsx` — `<UpdateBanner />`のマウント（1行追加）
- `apps/web/src/index.css` — バナー用スタイル追加
- `e2e/pwa.spec.ts`（新規） — manifest link・Service Worker登録の検証
- 一時的なアイコン生成用HTML＋Playwrightスクリプト（リポジトリには残さない使い捨て。生成したPNGのみコミット）

### 対象外（理由つき）

- **ダークモード時のsplash画面背景色の出し分け** — Web App Manifestの`background_color`はメディアクエリに対応しないため技術的に不可。ライトモードの配色（`--paper: #f6f5f0`）で固定する。
- **独自のインストール促進UI（`beforeinstallprompt`を使ったカスタムボタンなど）** — ブラウザ/OS標準のインストール導線（アドレスバーのインストールアイコン、共有→ホーム画面に追加）に任せる。「ホーム画面に追加できる」という要件はmanifestとService Workerの登録で満たされ、独自ボタンは今回のスコープに含めない。
- **プッシュ通知・バックグラウンド同期** — 要件に含まれておらず、今回のオフライン対応（precache）とは別軸の機能のため対象外。
- **`wrangler.jsonc`の変更** — 新規静的ファイル（`sw.js` / `manifest.webmanifest` / アイコン）は既存の`ASSETS`バインディング経由でそのまま配信される想定。実装後に`wrangler dev`でヘッダー等を確認するのみで、設定変更は不要と見込む。

## Web App Manifest

`vite-plugin-pwa`の`manifest`オプションで生成する（出力は`dist/manifest.webmanifest`、`index.html`への`<link rel="manifest">`・`<meta name="theme-color">`の挿入はプラグインが自動で行う）。

```ts
manifest: {
  name: "SQL学習アプリ",
  short_name: "SQL学習",
  description: "ブラウザ完結のSQL学習ターミナル",
  lang: "ja",
  display: "standalone",
  start_url: "/",
  scope: "/",
  theme_color: "#1d4ed8",
  background_color: "#f6f5f0",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}
```

`theme_color`/`background_color`は既存CSSのライトモード配色（`apps/web/src/index.css`の`--key: #1d4ed8`、`--paper: #f6f5f0`）に合わせる。

## アイコン生成

既存の`apps/web/public/favicon.svg`（48×46、正方形でないロゴ）を元に、正方形PNGを起こす。

1. ロゴを`background: #f6f5f0`の正方形キャンバス中央に配置した一時HTMLを用意する
2. Playwright（`@playwright/test`は既存devDependency）でそのHTMLを192px角・512px角でスクリーンショットし、`icon-192.png` / `icon-512.png`とする
3. maskable版はロゴ周囲に約20%のセーフゾーン余白を追加したレイアウトで同様にスクリーンショットし、`icon-maskable-192.png` / `icon-maskable-512.png`とする
4. iOSのホーム画面追加用に、透過なし・角丸なしの180px角版を`apple-touch-icon.png`として生成し、`index.html`に`<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`を追加する（iOS Safariはmanifestのicons配列を見ないため必須）

生成用の一時HTML/スクリプトはリポジトリに残さず、生成された5つのPNGのみを`apps/web/public/icons/`にコミットする（ロゴが変わる頻度は低く、恒久的なビルドスクリプトとして保守する価値がないと判断）。

## Service Worker（オフラインキャッシュ）

`generateSW`戦略を使う。ビルド成果物全体（JS/CSS/HTML/wasm/data/アイコン）をprecache対象にし、`registerType: "prompt"`で自動即時反映はせず、更新通知バナー経由でユーザーが明示的に反映する。

```ts
VitePWA({
  registerType: "prompt",
  manifest: { /* 上記 */ },
  workbox: {
    globPatterns: ["**/*.{js,css,html,wasm,data,svg,png,ico}"],
    // Workboxのデフォルト上限は2MiB。pglite-*.wasm(約10MB)・pglite-*.data(約6.3MB)が
    // 黙って precache から漏れて「オフラインでSQL実行だけ動かない」状態になるのを防ぐため必ず引き上げる。
    maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
    navigateFallback: "/index.html",
  },
  devOptions: {
    enabled: true,
    type: "module",
  },
})
```

`maximumFileSizeToCacheInBytes`の引き上げは、この機能の核心（オフラインでSQL実行まで含めて動く）を静かに壊しうる落とし穴なので明記しておく。

`devOptions.enabled: true`により`pnpm dev`（Vite開発サーバー）でもService Workerが登録されるようになり、既存のPlaywright e2e基盤（`playwright.config.ts`が`pnpm dev`を起動する構成）をそのまま使ってService Worker登録を検証できる。

## 更新通知UI

`apps/web/src/pwa/UpdateBanner.tsx`を新規追加し、`virtual:pwa-register/react`の`useRegisterSW()`フックを使う。

```tsx
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status">
      <span>更新があります</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>
        再読み込み
      </button>
    </div>
  );
}
```

`App.tsx`には`<UpdateBanner />`のマウントを1行追加するのみ。このコンポーネントはブラウザAPI/サードパーティフックへの薄いラッパーで抽出できる純粋ロジックがないため、`TerminalView`同様ユニットテスト対象にはせず、e2eでカバーする。

`apps/web/src/vite-env.d.ts`（新規）:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
```

## Cloudflare Workersでの配信

`wrangler.jsonc`は変更しない想定。`sw.js` / `manifest.webmanifest` / `apps/web/public/icons/*`は他の静的資産（`index.html`など）と同様に`dist/`直下に出力され、既存の`assets`バインディング（`run_worker_first: ["/api/*"]`で`/api/*`以外はWorkerを経由せず配信）でそのまま配信される。実装後に`wrangler dev`を起動し、`sw.js`のレスポンスヘッダーが長期キャッシュ（`immutable`等）になっていないことだけ確認する。

## テスト計画

- `e2e/pwa.spec.ts`（新規、`pnpm dev`ベースの既存e2e基盤で実行）
  - `/`にアクセスし、`<link rel="manifest">`が存在し`manifest.webmanifest`を指すことを確認
  - `navigator.serviceWorker.getRegistration()`がresolveし、登録が存在することを確認
- 実装後の手動確認（本リポジトリはCI未設定のため、`verify-web-ui`スキルと同様に手動ブラウザ確認を行う）
  - `pnpm build && pnpm --filter @sql-practice/web preview`で本番ビルドを起動
  - Chrome DevTools Applicationパネルで、Manifestの内容（name/icons/theme_color等）とインストール可能性を確認
  - Lighthouse PWA監査を実行し、重大な指摘がないことを確認
  - DevToolsでネットワークをOfflineに切り替えてリロードし、SCHEMA表示・SQL実行・正誤判定・XP表示が完全にオフラインで動作することを確認
  - ホーム画面追加後のアイコン・スプラッシュ画面をライト/ダークそれぞれで目視確認

## 既存アーキテクチャへの影響

`lineBuffer.ts` / `xp` / `schema` / `judge`など既存の純粋ロジックへの変更はない。`App.tsx`への1行追加（`<UpdateBanner />`）以外は新規ファイルのみで完結する。
