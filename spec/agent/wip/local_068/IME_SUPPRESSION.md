# 数値・16進入力での IME 自動無効化 仕様書

## 1. 概要

### 1.1 目的

数値系・16進数系の入力フィールドにおいて、日本語 IME の影響を排除し、入力体験を安定させる。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `inputMode` | HTML 属性。モバイルでの仮想キーボード種別のヒントを与え、デスクトップでは一部ブラウザが IME モード切替に利用する |
| composition | IME による変換中状態。`compositionstart` / `compositionend` イベントで検知可能 |

### 1.3 背景・問題

- 数値・16進数入力中に日本語 IME が有効だと、変換候補表示や確定操作が混ざり、入力体験とバリデーションが不安定になる
- 既存の入力コンポーネントのうち、一部は `inputMode="numeric"` が設定済みだが、16進数系フィールドには未設定
- `inputMode="numeric"` は 0-9 のみを想定するため、16進数フィールド (A-F を含む) には適用できない

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| 数値入力時の IME 誤変換 | 発生しうる | `inputMode="numeric"` で抑制済み (変更なし) |
| 16進入力時の IME 誤変換 | 発生しうる | composition イベントハンドラで中間テキストの混入を防止 |

### 1.5 着手条件

- なし (独立した UI 改善)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|--------|---------|---------|
| `src/components/forms/input-helpers.ts` | 変更 | composition 制御ユーティリティの追加 |
| `src/components/forms/timer0-vcount-range-input.tsx` | 変更 | composition ハンドラ適用 |
| `src/components/forms/mac-address-input.tsx` | 変更 | composition ハンドラ適用 |
| `src/test/unit/input-helpers.test.ts` | 新規 | ユーティリティのテスト |

## 3. 設計方針

### 3.1 現状の `inputMode` 適用状況

**`inputMode="numeric"` 設定済み (15 箇所)** — 変更不要:

- `iv-range-input.tsx` (2)
- `stats-fixed-input.tsx` (1)
- `date-range-picker.tsx` (3)
- `time-range-picker.tsx` (2)
- `datetime-input.tsx` (1)
- `egg-params-form.tsx` (3)
- `egg-filter-form.tsx` (1)
- `hidden-power-select.tsx` (1)

上記はいずれも 0-9 のみを期待するフィールドであり、`inputMode="numeric"` で IME 抑制が機能している。

**未設定 (16進数系)** — 今回の対象:

| コンポーネント | 入力形式 | 対応方針 |
|--------------|---------|---------|
| `timer0-vcount-range-input.tsx` | 16進数 (0-9, A-F) | composition ハンドラ適用 |
| `mac-address-input.tsx` | 16進数 (0-9, A-F) | composition ハンドラ適用 |
| `target-seeds-input.tsx` | 16進数 (textarea) | composition ハンドラ適用 |

### 3.2 composition ハンドラ方式

`inputMode="numeric"` は 0-9 のみを想定するため 16進数フィールドには不適切。
代わりに `compositionstart` / `compositionend` イベントを利用して、IME 変換中の中間テキストが値として採用されるのを防ぐ。

既存の `onChange` ハンドラには `filterHex` が含まれており、確定後のテキストから非16進文字を除去する。
composition ハンドラは「変換中フラグ」を管理し、`compositionend` 時に `onChange` を再評価することで、IME 確定後のテキストのみが処理される。

## 4. 実装仕様

### 4.1 `useCompositionHandler` フック

`input-helpers.ts` に追加する:

```ts
/**
 * IME composition の開始/終了を追跡するフック。
 * composition 中は onChange 処理をスキップし、compositionend 時に最終値を処理するために使用する。
 */
function useCompositionHandler(): {
  isComposing: React.MutableRefObject<boolean>;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
} {
  const isComposing = React.useRef(false);
  const onCompositionStart = React.useCallback(() => {
    isComposing.current = true;
  }, []);
  const onCompositionEnd = React.useCallback(() => {
    isComposing.current = false;
  }, []);
  return { isComposing, onCompositionStart, onCompositionEnd };
}
```

### 4.2 timer0-vcount-range-input.tsx への適用例

```tsx
const { isComposing, onCompositionStart, onCompositionEnd } = useCompositionHandler();

const handleChange = (index: number, raw: string, setter: (v: string) => void) => {
  if (isComposing.current) return; // composition 中はスキップ
  setter(filterHex(raw, maxLen));
};

// JSX
<Input
  onCompositionStart={onCompositionStart}
  onCompositionEnd={(e) => {
    onCompositionEnd();
    // compositionend 後に最終値で onChange を手動発火
    setter(filterHex(e.currentTarget.value, maxLen));
  }}
  onChange={(e) => handleChange(idx, e.target.value, setter)}
  // ...
/>
```

### 4.3 target-seeds-input.tsx への適用

textarea 要素にも `onCompositionStart` / `onCompositionEnd` を追加する。
ただし改行区切りの入力であるため、composition 中の `onChange` スキップのみで十分。
`compositionend` 後は既存の `onChange` コールバックが非16進文字を許容する形になっているため、
親コンポーネント側のパースロジック (`parsedSeeds` / `errors`) で自然にフィルタされる。

## 5. テスト方針

| テスト | 分類 | 検証内容 |
|-------|------|---------|
| `useCompositionHandler` フック | unit | `isComposing` ref が `compositionstart` / `compositionend` で正しくトグルされること |
| timer0-vcount 入力 | component | 通常入力で16進数がフィルタされること (既存テストがあれば拡張) |

composition イベントの発火はブラウザ依存のため、ユニットテストでは ref の状態遷移のみを検証する。
実際の IME 動作確認は手動テストで行う。

## 6. 実装チェックリスト

- [ ] `input-helpers.ts` に `useCompositionHandler` フックを追加
- [ ] `timer0-vcount-range-input.tsx` に composition ハンドラを適用
- [ ] `mac-address-input.tsx` に composition ハンドラを適用
- [ ] `target-seeds-input.tsx` に composition ハンドラを適用
- [ ] ユニットテスト追加
- [ ] 手動テスト: 日本語 IME 有効状態で各16進数フィールドに入力し、変換候補が値に混入しないことを確認
- [ ] `pnpm lint` / `pnpm format:check:ts` 通過
