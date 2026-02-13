# 数値・16進入力での IME 自動無効化 仕様書

## 1. 概要

### 1.1 目的

16進数系の入力フィールドで、IME composition 中の中間テキストが `onChange` で処理されることを防ぐ。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `inputMode` | HTML 属性。モバイルでの仮想キーボード種別のヒントを与え、デスクトップでは一部ブラウザが IME モード切替に利用する |
| composition | IME による変換中状態。`compositionstart` / `compositionend` イベントで検知可能 |
| `ime-mode` | 非標準 CSS プロパティ。IE/旧 Firefox で IME 状態を制御していたが、Chrome は未実装、Firefox v98 で削除済み。使用不可 |

### 1.3 背景・問題

- 16進数入力中に日本語 IME が有効だと、composition 中の中間テキストが `onChange` に渡される
- `inputMode="numeric"` は 0-9 のみを想定しモバイルで A-F が入力できないため、16進フィールドには不適切
- `ime-mode: inactive` (CSS) は非標準であり、Chrome は未実装、Firefox は v98 で削除済みのため使用できない
- `type="email"` 等で IME が自動無効化されるのはブラウザが特定の `type` を特別扱いしているため。16進入力に該当する `type` は存在しない

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| 16進入力中の composition 中間テキスト混入 | `filterHex` で除去されるが一時的に表示される | composition 中は `onChange` をスキップし、中間テキストが state に書き込まれない |

### 1.5 着手条件

- なし (独立した UI 改善)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|--------|---------|---------|
| `src/components/forms/input-helpers.ts` | 変更 | `useCompositionGuard` フック追加 |
| `src/components/forms/timer0-vcount-range-input.tsx` | 変更 | `useCompositionGuard` 適用 |
| `src/components/forms/mac-address-input.tsx` | 変更 | `useCompositionGuard` 適用 |
| `src/components/forms/target-seeds-input.tsx` | 変更 | `useCompositionGuard` 適用 |

## 3. 設計方針

### 3.1 IME 制御手段の比較

| 方式 | 利用可否 | 理由 |
|------|---------|------|
| `ime-mode: inactive` (CSS) | 不可 | 非標準。Chrome 未実装、Firefox v98 で削除 |
| `inputMode="numeric"` | 不適 | 0-9 のみ。A-F が入力できない |
| `type="email"` / `type="url"` | 不適 | セマンティクスが異なり、バリデーション挙動も変わる |
| composition イベントガード | 可 | 全モダンブラウザで動作。既存の `filterHex` と組み合わせて使用 |

### 3.2 方針

`compositionstart` / `compositionend` イベントで「変換中フラグ」を管理し、composition 中は `onChange` の state 更新をスキップする。`compositionend` 時に確定後のテキストで `onChange` を再評価する。

既存の `filterHex` (非16進文字除去) と `onBlur` (値の正規化) は変更しない。composition ガードは中間テキストが state に書き込まれるのを防ぐ追加レイヤとして機能する。

### 3.3 現状の `inputMode` 適用状況

**`inputMode="numeric"` 設定済み (15 箇所)** — 変更不要:

`iv-range-input.tsx` (2), `stats-fixed-input.tsx` (1), `date-range-picker.tsx` (3), `time-range-picker.tsx` (2), `datetime-input.tsx` (1), `egg-params-form.tsx` (3), `egg-filter-form.tsx` (1), `hidden-power-select.tsx` (1)

上記は 0-9 のみを期待するフィールドであり、`inputMode="numeric"` で IME 抑制が機能している。

**未設定 (16進数系)** — 今回の対象:

| コンポーネント | 入力形式 |
|--------------|--------|
| `timer0-vcount-range-input.tsx` | 16進数 (0-9, A-F), 4 入力欄 |
| `mac-address-input.tsx` | 16進数 (0-9, A-F), 6 入力欄 |
| `target-seeds-input.tsx` | 16進数 (textarea) |

## 4. 実装仕様

### 4.1 `useCompositionGuard` フック

`input-helpers.ts` に追加する:

```ts
/**
 * IME composition 中の onChange スキップを実現するガード。
 * composition 中 (isComposing === true) は onChange 内で早期 return する。
 * compositionend ハンドラ内で確定後のテキストを処理する。
 */
function useCompositionGuard() {
  const isComposing = React.useRef(false);
  const handlers = React.useMemo(
    () => ({
      onCompositionStart: () => {
        isComposing.current = true;
      },
      onCompositionEnd: () => {
        isComposing.current = false;
      },
    }),
    []
  );
  return { isComposing, ...handlers } as const;
}
```

### 4.2 timer0-vcount-range-input.tsx への適用例

```tsx
const { isComposing, onCompositionStart, onCompositionEnd } = useCompositionGuard();

// onChange 内
const handleChange = (raw: string, setter: (v: string) => void, maxLen: number) => {
  if (isComposing.current) return;
  setter(filterHex(raw, maxLen));
};

// JSX
<Input
  onCompositionStart={onCompositionStart}
  onCompositionEnd={(e) => {
    onCompositionEnd();
    setter(filterHex(e.currentTarget.value, maxLen));
  }}
  onChange={(e) => handleChange(e.target.value, setter, maxLen)}
/>
```

## 5. テスト方針

composition イベントの発火はブラウザ・IME 依存のため、自動テストは最小限とし手動テストで検証する。

| テスト | 分類 | 検証内容 |
|-------|------|--------|
| 手動テスト | - | 日本語 IME 有効状態で各16進数フィールドに入力し、composition 中のテキストが state に反映されないこと |

## 6. 実装チェックリスト

- [ ] `input-helpers.ts` に `useCompositionGuard` フックを追加
- [ ] `timer0-vcount-range-input.tsx` に適用
- [ ] `mac-address-input.tsx` に適用
- [ ] `target-seeds-input.tsx` に適用
- [ ] 手動テスト: 日本語 IME 有効状態で16進数フィールドに入力し、中間テキストの混入がないことを確認
- [ ] `pnpm lint` / `pnpm format:check:ts` 通過
