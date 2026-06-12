# Timer0 自動トグル再同期 仕様書

## 1. 概要

### 1.1 目的

DS 設定フォームの Timer0/VCount 自動トグルを OFF から ON に戻した時、現在の `hardware` / `version` / `region` に対応するデフォルト Timer0/VCount 範囲を store と画面表示の両方へ反映する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Timer0/VCount 範囲 | `Timer0VCountRange[]`。起動時刻検索や Seed 解決で使う DS 起動条件の探索範囲 |
| Auto モード | `timer0Auto=true` の状態。DS 設定からデフォルト Timer0/VCount 範囲を自動採用する |
| Manual モード | `timer0Auto=false` の状態。ユーザが Timer0/VCount 範囲を手入力する |
| fallback | 現在の DS 設定にデフォルト範囲が存在しないため Auto モードにできず、Manual モードへ戻す処理 |

### 1.3 背景・問題

既存実装では、Auto モード中に `hardware`、`version`、`region` を変更した場合だけ `lookupDefaultRanges` を実行していた。一方で `setTimer0Auto(true)` は `timer0Auto` フラグだけを更新していた。

そのため Manual モードで Timer0/VCount を編集した後に Auto モードへ戻しても、store の `ranges` がデフォルト値へ戻らず、画面上も内部状態も手入力値を保持したままになる可能性があった。

### 1.4 期待効果

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| Auto OFF→ON | `timer0Auto` だけ ON になり、`ranges` は手入力値のまま残る可能性がある | 現在の DS 設定のデフォルト `ranges` に戻る |
| デフォルト未収集の組み合わせ | Auto 表示と内部値の整合が崩れる可能性がある | Auto ON を拒否し、Manual モードを維持して warning toast を表示する |
| 回帰検出 | Auto OFF→ON の再同期テストがない | store と UI の両方で回帰テストを持つ |

### 1.5 着手条件

- Timer0/VCount デフォルト範囲は `src/data/timer0-vcount-defaults.ts` の `lookupDefaultRanges` を正とする。
- 永続化 schema は変更しない。`timer0Auto` と `ranges` の既存フィールドを維持する。
- UI の fallback 文言は既存の DS 設定変更時と同じ warning toast を使う。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/stores/settings/ds-config.ts` | 修正 | `setTimer0Auto(true)` 時に現在の DS 設定からデフォルト範囲を lookup し、`ranges` を更新する |
| `src/features/ds-config/components/timer0-vcount-section.tsx` | 修正 | Auto ON 失敗時に既存 fallback toast を表示する |
| `src/test/unit/stores/ds-config.test.ts` | 修正 | Auto 再有効化時の `ranges` 復元と fallback 維持を検証する |
| `src/test/components/features/ds-config-form.test.tsx` | 修正 | Auto OFF→ON の画面表示がデフォルト範囲へ戻ることを検証する |

## 3. 設計方針

Timer0/VCount 自動 lookup は store の責務とする。UI は `setTimer0Auto` の結果を受けて通知だけを行い、DS 設定からデフォルト範囲を直接計算しない。

`setConfig` と `setTimer0Auto` の両方で同じ lookup 条件を使うため、`lookupDefaultRangesForConfig(config)` を store 内の小さな helper として定義する。

Auto ON 時の結果は以下とする。

| 条件 | store 更新 | 戻り値 |
|------|------------|--------|
| デフォルト範囲あり | `timer0Auto=true`、`ranges=defaults` | `undefined` |
| デフォルト範囲なし | `timer0Auto=false`、`ranges` は維持 | `'auto-fallback'` |

Manual OFF 操作は従来どおり `timer0Auto=false` のみを更新し、手入力範囲を維持する。これにより、ユーザが Manual 編集へ切り替えた直後に既存範囲を初期値として編集できる。

## 4. 実装仕様

### 4.1 `setTimer0Auto` の戻り値

`setTimer0Auto` は `setConfig` と同じ `SetConfigResult` を返す。

```typescript
type SetConfigResult = 'auto-fallback' | undefined;

interface DsConfigActions {
  setTimer0Auto: (auto: boolean) => SetConfigResult;
}
```

### 4.2 Auto ON 時の範囲復元

`setTimer0Auto(true)` は現在の `config` を使って `lookupDefaultRangesForConfig(get().config)` を実行する。デフォルト範囲がある場合は `timer0Auto` と `ranges` を同時に更新する。

```typescript
const defaults = lookupDefaultRangesForConfig(get().config);
if (defaults) {
  set({ timer0Auto: true, ranges: defaults });
  return;
}
```

デフォルト範囲がない場合は Manual モードを維持し、`ranges` は更新しない。

### 4.3 UI fallback 通知

`Timer0VCountSection` は `setTimer0Auto(checked)` の戻り値が `'auto-fallback'` の場合、既存の warning toast を表示する。

```typescript
const handleTimer0AutoChange = (checked: boolean) => {
  notifyFallback(setTimer0Auto(checked));
};
```

文言は DS 設定変更時の fallback と合わせる。

```typescript
t`No default Timer0/VCount data for this combination. Switched to manual mode.`
```

## 5. テスト方針

### 5.1 回帰テスト

| テスト | 検証内容 |
|--------|----------|
| `should restore default ranges when timer0Auto is enabled again` | Manual モードで変更した `ranges` が Auto ON で現在の DS 設定のデフォルトへ戻る |
| `should keep manual mode when timer0Auto is enabled for an unsupported combination` | デフォルト未収集の DS 設定では Auto ON にならず fallback を返す |
| `Auto OFF→ON で Timer0/VCount が現在の DS 設定のデフォルトに戻る` | UI 操作でも Timer0/VCount 入力欄がデフォルト値に戻り、disabled になる |

### 5.2 検証コマンド

```powershell
pnpm test:run src/test/unit/stores/ds-config.test.ts src/test/components/features/ds-config-form.test.tsx
pnpm exec tsc -b --noEmit
pnpm lint:ts
pnpm format:check:ts
git diff --check
pnpm test:run --project unit
```

## 6. 実装チェックリスト

- [x] Auto OFF→ON で `ranges` が復元されない原因を `setTimer0Auto` に特定した
- [x] `setTimer0Auto(true)` で現在の DS 設定からデフォルト Timer0/VCount 範囲を再 lookup する
- [x] デフォルト未収集の組み合わせでは Manual モードを維持して fallback を返す
- [x] Auto トグル操作時も fallback warning toast を表示する
- [x] store の回帰テストを追加する
- [x] UI 操作の回帰テストを追加する
- [x] TypeScript、lint、format、unit test で検証する
