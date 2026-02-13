# DS 設定機能 仕様書

## 1. 概要

### 1.1 目的

Phase 3 最初の機能として DS 設定 UI を実装する。
ユーザーが DS 本体・ROM の情報を入力し、検索パラメータ (Timer0/VCount 範囲) を確定する。
全検索機能 (起動時刻検索、孵化検索、misc 等) の前提データとなる。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| DsConfig | DS 本体情報。MAC アドレス、ハードウェア種別、ROM バージョン、リージョンの組 |
| Timer0 | DS 起動時にファームウェアが生成するカウンタ値 (u16)。個体差あり |
| VCount | LCD ドライバの垂直カウンタ値 (u8)。ハードウェア群 × ROM バージョン × リージョンに依存 |
| Timer0VCountRange | Timer0/VCount の min/max 範囲。検索時の探索空間を定義する |
| GameStartConfig | ゲーム起動方法 (つづきから/はじめから)、セーブ状態、ひかるおまもり有無 |
| Nazo 値 | SHA-1 メッセージの先頭 5 ワード。WASM 内部で hardware × version × region から解決される (JS 側で管理不要) |
| デフォルト範囲 | ハードウェア群 × ROM バージョン × リージョンの組み合わせに対応する既知の Timer0/VCount 範囲 |
| ハードウェア群 | DS/DSLite (`Ds`, `DsLite`) と DSi/3DS (`Dsi`, `Dsi3ds`) の 2 グループ。同一群内では Timer0/VCount 範囲は同一 |

### 1.3 背景・問題

- 現状の Store (`ds-config.ts`) とフック (`use-ds-config.ts`) は Phase 1 で実装済みだが、対応する UI が存在しない
- サイドバーにはプレースホルダ (`"DS settings (Phase 3)"`) が表示されているのみ
- 参照元 (pokemon-gen5-initseed) では ROM バージョン × リージョンに対応するデフォルト Timer0/VCount テーブルを持ち、Auto/Manual 切替で利便性を確保していたが、本プロジェクトにはこの仕組みがない
- 現在の `DEFAULT_RANGES` は固定値 1 パターン (BW Jpn DS_LITE 相当) のみ
- Timer0/VCount 範囲はハードウェア群 (DS/DSLite vs DSi/3DS) によっても異なるが、この情報は既存の仕様書に反映されていなかった

### 1.4 期待効果

| 効果 | 説明 |
|------|------|
| 検索実行の前提データ確定 | 全検索機能が DsConfig + Timer0VCountRange を参照可能になる |
| 初回入力の負担軽減 | デフォルト範囲テーブルにより、Timer0/VCount の手動入力が不要になる |
| 永続化による再入力不要 | Zustand persist により設定値がブラウザに保存される |

### 1.5 着手条件

- [x] Phase 1 完了 (Worker 基盤、状態管理基盤、i18n 基盤)
- [x] Phase 2 完了 (UI 部品、フォーム部品、レイアウト部品)
- [x] `useDsConfigStore` / `useDsConfig` フックが実装済み
- [x] `Timer0VCountRangeInput` コンポーネントが実装済み
- [x] `MacAddressInput` コンポーネントが実装済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/features/ds-config/components/ds-config-form.tsx` | 新規 | DS 設定フォーム (サイドバーに配置) |
| `src/features/ds-config/components/game-start-config-form.tsx` | 新規 | ゲーム起動設定フォーム (サイドバーに配置) |
| `src/features/ds-config/components/timer0-vcount-section.tsx` | 新規 | Timer0/VCount 範囲セクション (Auto/Manual 切替 + 複数セグメント対応) |
| `src/features/ds-config/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/ds-config/types.ts` | 新規 | 機能固有型定義 |
| `src/data/timer0-vcount-defaults.ts` | 新規 | ハードウェア群 × ROM バージョン × リージョン → デフォルト Timer0/VCount テーブル |
| `src/stores/settings/ds-config.ts` | 変更 | `timer0Auto` フラグ追加 |
| `src/hooks/use-ds-config.ts` | 変更 | `timer0Auto` の読み書きを公開 |
| `src/app.tsx` | 変更 | サイドバーに DS 設定フォームを配置 (メインコンテンツは後続機能で利用) |
| `src/components/forms/index.ts` | 変更 | `Timer0VCountRangeInput` の barrel export 追加 |
| `src/test/unit/data/timer0-vcount-defaults.test.ts` | 新規 | デフォルト範囲テーブルのテスト |
| `src/test/components/features/ds-config-form.test.tsx` | 新規 | フォーム操作テスト |

## 3. 設計方針

### 3.1 UI レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│  Header (5genSearch)                             [ja][🌙]   │
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │  Main Content                               │
│              │                                              │
│  ┌─────────┐ │                                              │
│  │DS 設定  │ │  (後続機能で利用。DS 設定のみの段階では空)     │
│  │         │ │                                              │
│  │ Version │ │                                              │
│  │ Region  │ │                                              │
│  │ Hardware│ │                                              │
│  │ MAC     │ │                                              │
│  │         │ │                                              │
│  ├─────────┤ │                                              │
│  │T0/VC    │ │                                              │
│  │ Auto/M  │ │                                              │
│  ├─────────┤ │                                              │
│  │起動設定 │ │                                              │
│  │ Mode    │ │                                              │
│  │ Save    │ │                                              │
│  │ Charm   │ │                                              │
│  └─────────┘ │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**PC**: サイドバーにコンパクトなフォーム。メインコンテンツは後続機能 (検索/生成) の追加時に利用する
**モバイル**: Sheet サイドバーにフォームを配置

### 3.2 サイドバー / メインの責務分離

| 領域 | 役割 | コンテンツ |
|------|------|-----------|
| サイドバー | 入力 | DsConfigForm + Timer0/VCount セクション + GameStartConfigForm |
| メインコンテンツ | 検索/生成 | DS 設定のみの段階では空。Phase 3 後半で検索フォーム・結果表示を配置 |

### 3.3 Timer0/VCount のデフォルト範囲テーブル

参照元 (pokemon-gen5-initseed) の Timer0/VCount データを移植し、DSi/3DS 群のデータを追加する。
詳細なデータ一覧は [TIMER0_VCOUNT_DATA.md](./TIMER0_VCOUNT_DATA.md) を参照。

```
lookupDefaultRanges(hardware, version, region) → Timer0VCountRange[] | undefined
```

- ハードウェア群 × ROM Version × Region の 56 パターン (2 群 × 4 version × 7 region) を対象
  - DS/DSLite 群: 28 パターンすべて確定済み
  - DSi/3DS 群: JPN 4 パターン確定済み、他 24 パターンは未収集 (`undefined`)
- 値は `Timer0VCountRange[]` 形式 (複数セグメント対応、BW2 の VCount ずれに対応)
- `undefined` が返された場合: Auto モードが利用不可であることを UI に反映し、Manual 入力を促す
- ハードウェア引数は `Hardware` 型をそのまま受け取り、内部で群に正規化する (`Ds | DsLite` → DS/DSLite 群、`Dsi | Dsi3ds` → DSi/3DS 群)

### 3.4 Auto / Manual モード

| モード | 動作 |
|--------|------|
| Auto (デフォルト) | hardware/version/region 変更時にデフォルト範囲テーブルから自動設定。Timer0/VCount 入力は読み取り専用。テーブルにデータがない場合 (`undefined`) は自動で Manual にフォールバックし通知 |
| Manual | ユーザーが Timer0/VCount 範囲を自由に編集可能。hardware/version/region 変更時に上書きしない |

`timer0Auto` フラグを `DsConfigState` に追加し、永続化対象とする。

### 3.5 バリデーション方針

| 項目 | 責務 | 方式 |
|------|------|------|
| MAC アドレス (各バイト 0x00–0xFF) | `MacAddressInput` (既存) | blur 時 parseHexByte |
| Timer0 (0x0000–0xFFFF) | `Timer0VCountRangeInput` (既存) | blur 時 parseHexWord |
| VCount (0x00–0xFF) | `Timer0VCountRangeInput` (既存) | blur 時 parseHexByte |
| min ≤ max | feature 側: `timer0-vcount-section.tsx` | blur 後に swap (min > max なら入れ替え) |
| GameStartConfig 整合性 | feature 側: `game-start-config-form.tsx` | WASM 側の validate ロジックに対応した UI 制御 |

**GameStartConfig の制約**:
- `StartMode::Continue` → `SaveState::NoSave` は不整合 (セーブがないのにつづきからはできない)
- `SaveState::WithMemoryLink` → BW2 専用 (BW では選択不可)
- `shiny_charm` → BW2 専用

これらは対応する Select / Checkbox を `disabled` にして入力段階で防ぐ。

**Version 切替時の自動リセット**: BW2 → BW 切替時に GameStartConfig の不整合を防ぐため、Store の `setConfig` アクション内部でリセットする。

| 条件 | リセット対象 | リセット後の値 |
|------|-------------|---------------|
| BW2 → BW 切替時 | `save_state` | `WithMemoryLink` だった場合 → `WithSave` に変更 |
| BW2 → BW 切替時 | `shiny_charm` | `false` に変更 |

リセットを Store アクションに配置する理由:
- UI コンポーネントの実装に依存せず、Store レベルで不変条件を保証する
- テストや別経路から `setConfig` を呼んだ場合にもリセットが走る

検討した代替案:
- **GameStartConfigForm の useEffect**: `config.version` を監視して自前でリセット → コンポーネント未マウント時にリセットされない、1 レンダー分の不整合が残る
- **Zustand subscribe**: `subscribeWithSelector` で version 変更を監視 → 暗黙の副作用で追跡困難
- **読み取り時の導出**: `getEffectiveSaveState(version, saveState)` で読み取り時に矯正 → Store の raw 値が不正のまま残り、WASM 呼び出し時に毎回変換が必要

### 3.6 状態管理

| 状態 | 配置先 | 永続化 | 理由 |
|------|--------|--------|------|
| `config` (DsConfig) | `useDsConfigStore` | あり | 検索パラメータとして全機能が参照 |
| `ranges` (Timer0VCountRange[]) | `useDsConfigStore` | あり | 同上 |
| `gameStart` (GameStartConfig) | `useDsConfigStore` | あり | 同上 |
| `timer0Auto` (boolean) | `useDsConfigStore` | あり | Auto/Manual 設定を維持 |
| フォーム入力中の一時値 | 各フォーム内 useState | なし | blur 時に Store へ反映 |

### 3.7 翻訳方針

- UI ラベル・プレースホルダは `<Trans>` / `t` マクロで Lingui を使用
- `Select` の選択肢ラベル (Version, Region 等) は `game-data-names.ts` に追加する関数で locale 対応

## 4. 実装仕様

### 4.1 デフォルト範囲テーブル (`src/data/timer0-vcount-defaults.ts`)

```typescript
import type { Hardware, RomVersion, RomRegion, Timer0VCountRange } from '../wasm/wasm_pkg.js';

/** ハードウェア群。DS/DSLite と DSi/3DS で Timer0/VCount 範囲が異なる */
type HardwareGroup = 'DsLite' | 'Dsi';

type DefaultRangeKey = `${HardwareGroup}_${RomVersion}_${RomRegion}`;

function toHardwareGroup(hardware: Hardware): HardwareGroup {
  return hardware === 'Dsi' || hardware === 'Dsi3ds' ? 'Dsi' : 'DsLite';
}

// Partial — 未収集エントリは存在しない (undefined)
const DEFAULT_RANGE_TABLE: Partial<Record<DefaultRangeKey, Timer0VCountRange[]>> = {
  // === DS/DSLite 群: 28 パターン全確定 ===
  DsLite_Black_Jpn: [{ timer0_min: 0x0C79, timer0_max: 0x0C7A, vcount_min: 0x60, vcount_max: 0x60 }],
  // ... (全 28 エントリ — 詳細は TIMER0_VCOUNT_DATA.md)

  // === DSi/3DS 群: JPN 4 パターン確定 ===
  Dsi_Black_Jpn:  [{ timer0_min: 0x1237, timer0_max: 0x1238, vcount_min: 0x8C, vcount_max: 0x8C }],
  Dsi_White_Jpn:  [{ timer0_min: 0x1232, timer0_max: 0x1234, vcount_min: 0x8C, vcount_max: 0x8C }],
  Dsi_Black2_Jpn: [{ timer0_min: 0x150D, timer0_max: 0x1514, vcount_min: 0xA2, vcount_max: 0xA2 }],
  Dsi_White2_Jpn: [{ timer0_min: 0x18AF, timer0_max: 0x18B3, vcount_min: 0xBE, vcount_max: 0xBE }],
  // DSi/3DS JPN 以外: 未収集 (エントリなし → undefined)
};

/**
 * ハードウェア群 × ROM バージョン × リージョンに対応するデフォルト Timer0/VCount 範囲を返す。
 * データが未収集の場合は undefined を返す。
 */
export function lookupDefaultRanges(
  hardware: Hardware,
  version: RomVersion,
  region: RomRegion,
): Timer0VCountRange[] | undefined {
  const key: DefaultRangeKey = `${toHardwareGroup(hardware)}_${version}_${region}`;
  return DEFAULT_RANGE_TABLE[key];
}
```

### 4.2 Store 変更 (`src/stores/settings/ds-config.ts`)

**既存バグ修正**: `DEFAULT_RANGES` の VCount が 0x5E だが、DsLite/Black/Jpn の正しい値は 0x60 (参照元 `rom-parameters.ts` と一致)。`timer0Auto` 追加と合わせて修正する。

```typescript
interface DsConfigState {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  gameStart: GameStartConfig;
  timer0Auto: boolean;  // 追加
}

// VCount 0x5E → 0x60 に修正
const DEFAULT_RANGES: Timer0VCountRange[] = [
  { timer0_min: 0x0C79, timer0_max: 0x0C7A, vcount_min: 0x60, vcount_max: 0x60 },
];

const DEFAULT_STATE: DsConfigState = {
  config: DEFAULT_DS_CONFIG,
  ranges: DEFAULT_RANGES,
  gameStart: DEFAULT_GAME_START,
  timer0Auto: true,
};
```

Actions に `setTimer0Auto` を追加し、`setConfig` に版切替リセットを組み込む:

```typescript
interface DsConfigActions {
  // ... 既存
  setTimer0Auto: (auto: boolean) => void;
}

// setConfig 内部で BW2→BW 切替時に GameStartConfig をリセット
setConfig: (partial) =>
  set((state) => {
    const newConfig = { ...state.config, ...partial };
    const prevIsBw2 = state.config.version === 'Black2' || state.config.version === 'White2';
    const nextIsBw2 = newConfig.version === 'Black2' || newConfig.version === 'White2';
    const gameStart = (prevIsBw2 && !nextIsBw2)
      ? {
          ...state.gameStart,
          save_state: state.gameStart.save_state === 'WithMemoryLink'
            ? ('WithSave' as const)
            : state.gameStart.save_state,
          shiny_charm: false,
        }
      : state.gameStart;
    return { config: newConfig, gameStart };
  }),
```

**Persist 方針**: `version` は現行の `1` を維持する。`timer0Auto` フィールド追加時にバージョンを上げない。Zustand persist のデフォルト merge (`{ ...initialState, ...persistedState }`) により、永続化データに `timer0Auto` が存在しない場合は初期値 `true` が適用される。仕様安定後に破壊的変更が入った時点で初めてマイグレーションを検討する。

### 4.3 フック変更 (`src/hooks/use-ds-config.ts`)

既存の `useDsConfig()` に `timer0Auto` / `setTimer0Auto` を追加する。

```typescript
export function useDsConfig() {
  // ... 既存フィールド
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const setTimer0Auto = useDsConfigStore((s) => s.setTimer0Auto);

  return {
    // ... 既存フィールド
    timer0Auto,
    setTimer0Auto,
  } as const;
}
```

**購読粒度の指針**: `useDsConfig()` は全スライスを購読するため、不要な再レンダーを招きやすい。各コンポーネントでは `useDsConfigStore` から必要なスライスのみ直接セレクトする。`useDsConfig()` の利用は `DsConfigForm` など大半のフィールドを必要とする箇所に限定する。

### 4.4 DsConfigForm (`src/features/ds-config/components/ds-config-form.tsx`)

サイドバーに配置する DS 本体設定フォーム。

```tsx
function DsConfigForm() {
  const { config, setConfig, ranges, setRanges, timer0Auto, setTimer0Auto } = useDsConfig();

  // Version/Region/Hardware 変更時に Auto なら ranges を更新
  const applyAutoRanges = (hw: Hardware, ver: RomVersion, reg: RomRegion) => {
    if (!timer0Auto) return;
    const defaults = lookupDefaultRanges(hw, ver, reg);
    if (defaults) {
      setRanges(defaults);
    } else {
      // データ未収集 → Manual にフォールバック + Toast 通知
      setTimer0Auto(false);
      toast({ variant: 'warning', description: t`...` });
    }
  };

  // BW2→BW 切替時の GameStartConfig リセットは Store の setConfig 内で自動処理
  const handleVersionChange = (version: RomVersion) => {
    setConfig({ version });
    applyAutoRanges(config.hardware, version, config.region);
  };

  const handleRegionChange = (region: RomRegion) => {
    setConfig({ region });
    applyAutoRanges(config.hardware, config.version, region);
  };

  const handleHardwareChange = (hardware: Hardware) => {
    setConfig({ hardware });
    applyAutoRanges(hardware, config.version, config.region);
  };

  return (
    <div className="space-y-4">
      {/* Version Select */}
      {/* Region Select */}
      {/* Hardware Select */}
      {/* MAC Address Input */}
      {/* Timer0/VCount Section */}
    </div>
  );
}
```

### 4.5 GameStartConfigForm (`src/features/ds-config/components/game-start-config-form.tsx`)

```tsx
function GameStartConfigForm() {
  // 必要なスライスのみ直接セレクト (config 全体の購読を避ける)
  const isBw2 = useDsConfigStore(
    (s) => s.config.version === 'Black2' || s.config.version === 'White2'
  );
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const setGameStart = useDsConfigStore((s) => s.setGameStart);

  return (
    <div className="space-y-3">
      {/* StartMode: Select (NewGame / Continue) */}
      {/* SaveState: Select (NoSave / WithSave / WithMemoryLink) */}
      {/*   - WithMemoryLink: disabled={!isBw2} */}
      {/*   - NoSave: disabled={gameStart.start_mode === 'Continue'} */}
      {/* ShinyCharm: Checkbox, disabled={!isBw2} */}
    </div>
  );
}
```

### 4.6 Timer0VCountSection (`src/features/ds-config/components/timer0-vcount-section.tsx`)

Auto/Manual 切替 + 複数 `Timer0VCountRange` セグメント表示。

```tsx
function Timer0VCountSection() {
  // 必要なスライスのみ直接セレクト
  const ranges = useDsConfigStore((s) => s.ranges);
  const setRanges = useDsConfigStore((s) => s.setRanges);
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const setTimer0Auto = useDsConfigStore((s) => s.setTimer0Auto);

  return (
    <div className="space-y-3">
      {/* Auto/Manual 切替 (Checkbox or Toggle) */}
      {ranges.map((range, i) => (
        <Timer0VCountRangeInput
          key={i}
          value={range}
          onChange={(updated) => {
            const next = [...ranges];
            next[i] = updated;
            setRanges(next);
          }}
          disabled={timer0Auto}
        />
      ))}
    </div>
  );
}
```

### 4.7 App 統合 (`src/app.tsx`)

```tsx
import { DsConfigForm, GameStartConfigForm } from './features/ds-config';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarContent = (
    <>
      <DsConfigForm />
      <GameStartConfigForm />
    </>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <ResponsiveContainer
        sidebarContent={sidebarContent}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {/* Phase 3 後半: 検索フォーム・結果表示をここに配置 */}
      </ResponsiveContainer>
      <Toaster />
    </div>
  );
}
```

### 4.8 ゲームデータ名称追加 (`src/lib/game-data-names.ts`)

```typescript
// Version / Region / Hardware のラベル取得関数を追加

export function getVersionName(version: RomVersion, locale: SupportedLocale): string { ... }
export function getRegionName(region: RomRegion, locale: SupportedLocale): string { ... }
export function getHardwareName(hardware: Hardware, locale: SupportedLocale): string { ... }
export function getStartModeName(mode: StartMode, locale: SupportedLocale): string { ... }
export function getSaveStateName(state: SaveState, locale: SupportedLocale): string { ... }
```

### 4.9 barrel export 修正 (`src/components/forms/index.ts`)

```typescript
// 追加
export { Timer0VCountRangeInput } from './timer0-vcount-range-input';
export type { Timer0VCountRangeInputProps } from './timer0-vcount-range-input';
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | ファイル | 検証内容 |
|--------|---------|---------|
| デフォルト範囲テーブル網羅性 (DS/DSLite) | `data/timer0-vcount-defaults.test.ts` | DS/DSLite 群の全 28 パターンが定義されていること |
| デフォルト範囲テーブル網羅性 (DSi/3DS JPN) | 同上 | DSi/3DS 群の JPN 4 パターンが定義されていること |
| デフォルト範囲テーブル妥当性 | 同上 | 各範囲の min ≤ max、VCount が u8 範囲内 |
| lookupDefaultRanges — 確定値 | 同上 | 既知の hardware × version × region で期待値が返ること |
| lookupDefaultRanges — 未収集 | 同上 | DSi/3DS + JPN 以外で `undefined` が返ること |
| timer0Auto フラグの Store 反映 | `stores/ds-config.test.ts` (既存に追加) | setTimer0Auto が状態を更新すること |
| setConfig BW2→BW リセット | 同上 | BW2→BW 切替時に save_state / shiny_charm がリセットされること |
| DEFAULT_RANGES VCount 修正 | 同上 | DsLite/Black/Jpn の VCount が 0x60 であること |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | ファイル | 検証内容 |
|--------|---------|---------|
| DsConfigForm 描画 | `features/ds-config-form.test.tsx` | 初期値が正しく表示されること |
| Version 変更 → Auto 更新 | 同上 | version 変更時に Timer0/VCount 範囲が自動更新されること |
| Manual モード切替 | 同上 | Auto → Manual 切替後に Timer0/VCount が編集可能になること |
| GameStartConfig BW2 制約 | 同上 | BW 選択時に MemoryLink / ShinyCharm が無効化されること |
| BW2→BW 切替 GameStart リセット | 同上 | BW2→BW 切替時に MemoryLink→WithSave, shiny_charm→false にリセットされること |

## 6. 実装チェックリスト

- [x] `src/data/timer0-vcount-defaults.ts` — デフォルト範囲テーブル (DS/DSLite 28 + DSi/3DS JPN 4 パターン)
- [x] `src/stores/settings/ds-config.ts` — `timer0Auto` 追加、`DEFAULT_RANGES` VCount 修正 (0x5E→0x60)、`setConfig` にリセットロジック追加
- [x] `src/hooks/use-ds-config.ts` — `timer0Auto` 読み書き公開
- [x] `src/lib/game-data-names.ts` — Version/Region/Hardware/StartMode/SaveState 名称関数
- [x] `src/features/ds-config/types.ts` — 機能固有型定義
- [x] `src/features/ds-config/components/ds-config-form.tsx` — DS 設定フォーム
- [x] `src/features/ds-config/components/game-start-config-form.tsx` — ゲーム起動設定フォーム
- [x] `src/features/ds-config/components/timer0-vcount-section.tsx` — Timer0/VCount セクション
- [x] `src/features/ds-config/index.ts` — barrel export
- [x] `src/app.tsx` — 統合
- [x] `src/components/forms/index.ts` — Timer0VCountRangeInput の barrel export 追加
- [x] `src/test/unit/data/timer0-vcount-defaults.test.ts` — テーブルテスト
- [x] `src/test/components/features/ds-config-form.test.tsx` — フォームテスト
- [x] Lingui カタログ更新 (`pnpm lingui:extract`)

## 7. 検討事項 (レビュー論点)

### 7.1 Timer0/VCount デフォルト値の配置先

**選択肢 A**: JS 側 (`src/data/timer0-vcount-defaults.ts`) に TypeScript 定数として保持 (本仕様の方針)
**選択肢 B**: Rust 側に `get_default_timer0_vcount_ranges(hardware, version, region)` API を追加し、WASM 経由で取得

選択肢 A を採用した理由:
- 56 パターン (うち半数未収集) の小規模テーブルであり WASM 往復のコストに見合わない
- Nazo 値のように SHA-1 計算に直結する内部定数とは性質が異なる
- デフォルト値はあくまでUI のヘルパーであり、ユーザーが Manual で上書き可能
- 未収集データを段階的に追加する際、JS 側テーブルの方が変更が容易

### 7.2 複数セグメントの UI 表現

BW2 の一部リージョン (GER, ITA 等) では VCount が Timer0 範囲ごとに異なり、Range が複数セグメントになる。
Auto モードでは read-only で複数セグメントを表示する。Manual モードでの複数セグメント編集 (追加/削除) は Phase 4 以降に検討する。初期実装では Manual 時は単一セグメントのみ編集可能とする。

### 7.3 デフォルト値の情報源

| ハードウェア群 | ソース | 備考 |
|---------------|--------|------|
| DS/DSLite | [niart120/pokemon-gen5-initseed](https://github.com/niart120/pokemon-gen5-initseed) の `src/data/rom-parameters.ts` | 全 28 パターン確定 |
| DSi/3DS JPN | ユーザー提供データ | 4 パターン確定 |
| DSi/3DS JPN 以外 | 未収集 | `undefined` として扱い Manual 入力を促す |

### 7.4 Auto フォールバック時の UX

DSi/3DS + JPN 以外の組み合わせでは Auto モードが利用不可。
`lookupDefaultRanges` が `undefined` を返した場合、自動で Manual にフォールバックし Toast で通知する。
データが揃い次第テーブルを更新すれば、Auto が自然に有効化される設計。
