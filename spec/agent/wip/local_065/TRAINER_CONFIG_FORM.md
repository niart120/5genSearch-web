# トレーナー情報設定 UI 仕様書

## 1. 概要

### 1.1 目的

サイドバーにトレーナー情報 (TID / SID) の設定フォームを追加する。
TID/SID は色違い判定やポケモン生成で必要となる共通設定であり、`DsConfigForm` / `GameStartConfigForm` と同列にサイドバーに配置する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| TID (Trainer ID) | トレーナー ID (0–65535)。ゲーム内の「IDNo.」に対応 |
| SID (Secret ID) | 裏 ID (0–65535)。ゲーム内では非表示。色違い判定に使用 |
| TrainerInfo | WASM 型 `{ tid: number; sid: number }`。各検索・生成 API の入力で参照される |

### 1.3 背景・問題

- `useTrainerStore` (Zustand persist) と `useTrainer` フックは実装済みだが、値を編集する UI が存在しない
- `egg-search-page` は `tid ?? 0, sid ?? 0` とフォールバックしており、ユーザーが値を設定する手段がない
- ポケモンリスト生成 (local_064) でも `PokemonGenerationParams.trainer` に TID/SID が必要

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| サイドバーからの一括設定 | 全機能で共通の TID/SID を 1 箇所で管理 |
| 色違い判定精度 | TID/SID 未設定による誤判定を防止 |

### 1.5 着手条件

- DS 設定 (Phase 3.1) が完了していること (サイドバー構造が確立済み)

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/ds-config/components/trainer-config-form.tsx` | 新規 | TID/SID 入力フォーム |
| `src/features/ds-config/index.ts` | 変更 | `TrainerConfigForm` を re-export に追加 |
| `src/app.tsx` | 変更 | サイドバーに `<TrainerConfigForm />` を追加 |
| `src/test/components/trainer-config-form.test.tsx` | 新規 | コンポーネントテスト |

---

## 3. 設計方針

### 3.1 配置

サイドバーの `<DsConfigForm />` と `<GameStartConfigForm />` の間に配置する。

```
サイドバー (space-y-6)
├── DsConfigForm        (Version / Region / Hardware / MAC / Timer0/VCount)
├── TrainerConfigForm   (TID / SID)    ← 新規
└── GameStartConfigForm (StartMode / Save / MemoryLink / ShinyCharm)
```

理由: TID/SID はカートリッジ (DS 設定) とゲーム起動条件の中間に位置する情報であり、論理的な順序として DS 設定の直下が適切。

### 3.2 状態管理

既存の `useTrainerStore` (localStorage persist 済み) をそのまま使用する。
新たな Store やフックの追加は不要。

### 3.3 入力制約

| フィールド | 型 | 範囲 | 備考 |
|-----------|-----|------|------|
| TID | `number \| undefined` | 0–65535 | 空欄許容 (`undefined` → 未設定) |
| SID | `number \| undefined` | 0–65535 | 空欄許容 (`undefined` → 未設定) |

- 範囲外入力はクランプ (0 未満 → 0, 65535 超 → 65535)
- 非数値入力は無視

---

## 4. 実装仕様

### 4.1 TrainerConfigForm

```typescript
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTrainerStore } from '@/stores/settings/trainer';

function TrainerConfigForm() {
  const { t } = useLingui();
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const setTid = useTrainerStore((s) => s.setTid);
  const setSid = useTrainerStore((s) => s.setSid);

  const handleChange = (
    setter: (v: number | undefined) => void,
    raw: string
  ) => {
    if (raw === '') {
      setter(undefined);
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    setter(Math.max(0, Math.min(65535, n)));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tid" className="text-xs">
          <Trans>TID</Trans>
        </Label>
        <Input
          id="tid"
          type="number"
          min={0}
          max={65535}
          placeholder={t`Trainer ID`}
          value={tid ?? ''}
          onChange={(e) => handleChange(setTid, e.target.value)}
          aria-label={t`Trainer ID`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sid" className="text-xs">
          <Trans>SID</Trans>
        </Label>
        <Input
          id="sid"
          type="number"
          min={0}
          max={65535}
          placeholder={t`Secret ID`}
          value={sid ?? ''}
          onChange={(e) => handleChange(setSid, e.target.value)}
          aria-label={t`Secret ID`}
        />
      </div>
    </div>
  );
}

export { TrainerConfigForm };
```

### 4.2 index.ts 変更

```typescript
export { DsConfigForm } from './components/ds-config-form';
export { TrainerConfigForm } from './components/trainer-config-form';
export { GameStartConfigForm } from './components/game-start-config-form';
export { Timer0VCountSection } from './components/timer0-vcount-section';
```

### 4.3 app.tsx 変更

```tsx
import { DsConfigForm, TrainerConfigForm, GameStartConfigForm } from '@/features/ds-config';

const sidebarContent = (
  <div className="space-y-6">
    <DsConfigForm />
    <TrainerConfigForm />
    <GameStartConfigForm />
  </div>
);
```

---

## 5. テスト方針

### 5.1 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|----------|
| 初期表示 (未設定) | TID/SID のフィールドが空欄 |
| 値入力 | 数値入力 → Store に反映 |
| 範囲クランプ | 65536 入力 → 65535 に補正 |
| 空欄 → undefined | 値クリア → Store が `undefined` |
| 非数値入力 | アルファベット入力 → 無視 |

---

## 6. 実装チェックリスト

- [ ] `src/features/ds-config/components/trainer-config-form.tsx` — フォームコンポーネント
- [ ] `src/features/ds-config/index.ts` — re-export 追加
- [ ] `src/app.tsx` — サイドバーに `<TrainerConfigForm />` 追加
- [ ] `src/test/components/trainer-config-form.test.tsx` — コンポーネントテスト
- [ ] i18n: `pnpm lingui:extract` で翻訳キー抽出・追加
