# Sidebar プロファイル管理 仕様書

## 1. 概要

### 1.1 目的

Sidebar に表示される DS 設定・トレーナー情報を「プロファイル」として複数保存・切替・インポート/エクスポートできる機能を提供する。複数の DS 本体やカートリッジを所有するユーザが、設定の再入力なしに環境を切り替えられるようにする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| プロファイル | Sidebar 設定のスナップショット。DsConfig + Timer0VCountRange[] + timer0Auto + GameStartConfig + TrainerInfo を 1 セットにしたもの |
| アクティブプロファイル | 現在 Sidebar に反映されているプロファイル。`ds-config` Store + `trainer` Store の状態と同期する |
| ダーティ状態 | アクティブプロファイルの保存済み内容と Sidebar の現在値が不一致の状態 |

### 1.3 背景・問題

- 参照実装 (niart120/pokemon-gen5-initseed) では単一の巨大 Store にプロファイル機能を内包していたが、Store 肥大化・`useEffect` による Profile 同期の散逸が問題となった
- 現在の実装は `ds-config` Store と `trainer` Store が独立して永続化されており、プロファイル相当の状態は揃っているが「複数セットの保存・切替」ができない
- BW/BW2 では DS 本体ごとに MAC アドレス・Timer0/VCount が異なるため、複数環境を扱うユーザにとって手動切替は煩雑

### 1.4 期待効果

| 指標 | 現状 | 導入後 |
|------|------|--------|
| 環境切替の操作数 | 全フィールド手入力 (7+ フィールド) | ドロップダウンから 1 回選択 |
| 設定喪失リスク | 上書き時に旧設定が消失 | 名前付きプロファイルで保全 |
| 設定共有 | 不可 | JSON ファイルでインポート/エクスポート |

### 1.5 着手条件

- `ds-config` Store (永続化済み) が安定稼働していること
- `trainer` Store (永続化済み) が安定稼働していること
- Toast コンポーネントが実装済みであること

上記はすべて満たされている。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/stores/settings/profile.ts` | 新規 | Profile Store (プロファイルリスト + アクティブ ID + CRUD) |
| `src/stores/settings/index.ts` | 修正 | `profile.ts` の re-export 追加 |
| `src/hooks/use-profile.ts` | 新規 | Profile Store 隠蔽フック |
| `src/features/ds-config/components/profile-selector.tsx` | 新規 | プロファイル選択ドロップダウン + 保存/削除ボタン |
| `src/features/ds-config/components/profile-name-dialog.tsx` | 新規 | プロファイル名入力ダイアログ (新規作成・リネーム) |
| `src/features/ds-config/components/profile-confirm-dialog.tsx` | 新規 | 未保存変更の破棄/保存確認ダイアログ |
| `src/features/ds-config/components/profile-import-export.tsx` | 新規 | インポート/エクスポートボタン群 |
| `src/features/ds-config/index.ts` | 修正 | 新コンポーネントの re-export 追加 |
| `src/app.tsx` | 修正 | Sidebar 内に `ProfileSelector` を配置 |
| `src/stores/sync.ts` | 修正 | プロファイル ↔ ds-config / trainer 同期サブスクリプション追加 |
| `src/lib/validation.ts` | 修正 | プロファイル JSON バリデーション関数追加 |
| `src/i18n/locales/ja/messages.po` | 修正 | 日本語翻訳追加 |
| `src/i18n/locales/en/messages.po` | 修正 | 英語翻訳追加 |
| `src/test/unit/profile-store.test.ts` | 新規 | Profile Store ユニットテスト |
| `src/test/components/profile-selector.test.tsx` | 新規 | ProfileSelector コンポーネントテスト |

## 3. 設計方針

### 3.1 レイヤー構成

```
Profile Store (stores/settings/profile.ts)
    ↕ subscribe 同期 (stores/sync.ts)
ds-config Store ←→ Sidebar フォーム (DsConfigForm 等)
trainer Store   ←→ Sidebar フォーム (TrainerConfigForm)
    ↑
ProfileSelector (UI) → use-profile hook → Profile Store
```

Profile Store はプロファイルリストとアクティブ ID を保持する。`ds-config` / `trainer` Store は従来通り Sidebar フォームの「現在値」を保持する。プロファイル切替時に Profile Store → ds-config / trainer Store へ一方向同期する。

`use-profile` hook は `hooks/` に配置する。理由: Profile Store は `stores/settings/` の機能横断 Store であり、`features/ds-config/` 固有ではない。`ds-config` feature 内のコンポーネント (`DsConfigForm` 等) が Store 直接参照しているのは feature 内例外ルールによるもので、Profile Store の参照パターンとは区別する。

### 3.2 状態の持ち方

#### Profile Store (新規・永続化)

```typescript
interface ProfileData {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  timer0Auto: boolean;
  gameStart: GameStartConfig;
  tid: number | undefined;
  sid: number | undefined;
}

interface ProfileEntry {
  id: string;        // crypto.randomUUID()
  name: string;      // ユーザ入力
  data: ProfileData;
  createdAt: number;  // Date.now()
  updatedAt: number;  // Date.now()
}

interface ProfileState {
  profiles: ProfileEntry[];
  activeProfileId: string | undefined;
}
```

永続化キー: `profiles`。上限なし (localStorage 容量まで)。

#### ds-config / trainer Store

変更なし。従来通り Sidebar の「現在値」を保持する。プロファイル切替時に Profile Store から値が注入される。

### 3.3 ダーティ判定

「ダーティ」= アクティブプロファイル保存時の `ProfileData` と、現在の `ds-config` + `trainer` Store の状態が不一致。

判定は `use-profile` hook 内で `useMemo` を使い、アクティブプロファイルの `data` と現在の Store 状態を `JSON.stringify` で deep equal 比較する。ダーティ判定は UI 表示 (保存ボタンの強調) とプロファイル切替時の確認ダイアログ表示に使用する。

### 3.4 プロファイル切替フロー

```
ユーザが別プロファイルを選択
    │
    ├─ ダーティでない → 即座に切替 (ds-config / trainer Store を書き換え)
    │
    └─ ダーティ → 確認ダイアログ表示
                    ├─ 「保存して切替」→ アクティブプロファイルを上書き保存 → 切替
                    ├─ 「破棄して切替」→ 保存せず切替
                    └─ 「キャンセル」→ 何もしない
```

### 3.5 同期方式

`stores/sync.ts` に Profile → ds-config / trainer の一方向同期を追加する。

```typescript
// プロファイル切替時: Profile Store → ds-config / trainer Store
function applyProfile(data: ProfileData): void {
  useDsConfigStore.getState().replaceConfig(data.config);
  useDsConfigStore.getState().setRanges(data.ranges);
  useDsConfigStore.getState().setTimer0Auto(data.timer0Auto);
  useDsConfigStore.getState().setGameStart(data.gameStart);
  useTrainerStore.getState().setTrainer(data.tid, data.sid);
}
```

逆方向 (ds-config / trainer → Profile) の自動同期は行わない。ユーザが明示的に「保存」した時点でのみ Profile Store を更新する。

### 3.6 WASM API との対応

プロファイル機能は純粋に TS 側の永続化・UI 機能であり、WASM API の変更は不要。各 feature の検索実行時は従来通り `ds-config` / `trainer` Store から値を取得するため、プロファイル導入による変更は発生しない。

### 3.7 インポート/エクスポート形式

単一プロファイル単位の JSON ファイル。

```json
{
  "$schema": "5genSearch-profile-v1",
  "name": "My DS Lite - Black",
  "data": {
    "config": {
      "mac": [0, 9, 191, 42, 78, 210],
      "hardware": "DsLite",
      "version": "Black",
      "region": "Jpn"
    },
    "ranges": [
      {
        "timer0_min": 3193,
        "timer0_max": 3194,
        "vcount_min": 96,
        "vcount_max": 96
      }
    ],
    "timer0Auto": true,
    "gameStart": {
      "start_mode": "Continue",
      "save": "WithSave",
      "memory_link": "Disabled",
      "shiny_charm": "NotObtained"
    },
    "tid": 12345,
    "sid": 54321
  }
}
```

エクスポート時のファイル名: `profile-{name}.json` (名前中の非 ASCII / 記号はハイフンに置換)。

インポート時は JSON スキーマバリデーションを実施し、不正な値はエラー Toast で通知する。インポートしたプロファイルは新規エントリとして追加される (既存プロファイルの上書きはしない)。

## 4. 実装仕様

### 4.1 Profile Store

```typescript
// src/stores/settings/profile.ts
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '../../wasm/wasm_pkg.js';

export interface ProfileData {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  timer0Auto: boolean;
  gameStart: GameStartConfig;
  tid: number | undefined;
  sid: number | undefined;
}

export interface ProfileEntry {
  id: string;
  name: string;
  data: ProfileData;
  createdAt: number;
  updatedAt: number;
}

interface ProfileState {
  profiles: ProfileEntry[];
  activeProfileId: string | undefined;
}

interface ProfileActions {
  /** 現在の設定から新規プロファイルを作成 */
  createProfile: (name: string, data: ProfileData) => string;
  /** アクティブプロファイルの内容を上書き保存 */
  saveActiveProfile: (data: ProfileData) => void;
  /** プロファイル名を変更 */
  renameProfile: (id: string, name: string) => void;
  /** プロファイルを削除 */
  deleteProfile: (id: string) => void;
  /** アクティブプロファイルを切替 */
  setActiveProfileId: (id: string | undefined) => void;
  /** インポートしたプロファイルを追加 */
  importProfile: (entry: Omit<ProfileEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  /** 全プロファイルをリセット */
  reset: () => void;
}

const DEFAULT_STATE: ProfileState = {
  profiles: [],
  activeProfileId: undefined,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
      ...DEFAULT_STATE,

      createProfile: (name, data) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const entry: ProfileEntry = { id, name, data, createdAt: now, updatedAt: now };
        set((state) => ({
          profiles: [...state.profiles, entry],
          activeProfileId: id,
        }));
        return id;
      },

      saveActiveProfile: (data) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === activeProfileId
              ? { ...p, data, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      renameProfile: (id, name) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId:
            state.activeProfileId === id ? undefined : state.activeProfileId,
        }));
      },

      setActiveProfileId: (id) => set({ activeProfileId: id }),

      importProfile: (entry) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => ({
          profiles: [
            ...state.profiles,
            { ...entry, id, createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      reset: () => set(DEFAULT_STATE),
    }),
      {
        name: 'profiles',
        version: 1,
      }
    )
  )
);

export const getProfileInitialState = (): ProfileState => DEFAULT_STATE;
```

### 4.2 Profile Hook

```typescript
// src/hooks/use-profile.ts
import { useMemo } from 'react';
import { useProfileStore } from '../stores/settings/profile';
import { useDsConfigStore } from '../stores/settings/ds-config';
import { useTrainerStore } from '../stores/settings/trainer';
import type { ProfileData, ProfileEntry } from '../stores/settings/profile';

function collectCurrentData(): ProfileData {
  const { config, ranges, timer0Auto, gameStart } = useDsConfigStore.getState();
  const { tid, sid } = useTrainerStore.getState();
  return { config, ranges, timer0Auto, gameStart, tid, sid };
}

function isProfileDataEqual(a: ProfileData, b: ProfileData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useProfile() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // Actions は参照安定のため getState() 経由で取得 (rerender-defer-reads)
  // イベントハンドラ内でのみ使用するため購読不要
  const actions = useProfileStore.getState();

  // 現在の Store 状態を購読 (ダーティ判定用)
  const config = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const timer0Auto = useDsConfigStore((s) => s.timer0Auto);
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);

  const currentData: ProfileData = useMemo(
    () => ({ config, ranges, timer0Auto, gameStart, tid, sid }),
    [config, ranges, timer0Auto, gameStart, tid, sid]
  );

  const activeProfile: ProfileEntry | undefined = useMemo(
    () => profiles.find((p) => p.id === activeProfileId),
    [profiles, activeProfileId]
  );

  const isDirty = useMemo(() => {
    if (!activeProfile) return false;
    return !isProfileDataEqual(activeProfile.data, currentData);
  }, [activeProfile, currentData]);

  return {
    profiles,
    activeProfileId,
    activeProfile,
    isDirty,
    currentData,
    createProfile: actions.createProfile,
    saveActiveProfile: actions.saveActiveProfile,
    renameProfile: actions.renameProfile,
    deleteProfile: actions.deleteProfile,
    setActiveProfileId: actions.setActiveProfileId,
    importProfile: actions.importProfile,
    collectCurrentData,
  } as const;
}
```

### 4.3 ProfileSelector コンポーネント

Sidebar 上部に配置。ドロップダウンでプロファイル選択 + 保存/新規作成/削除/インポート/エクスポートボタン。

```tsx
// src/features/ds-config/components/profile-selector.tsx
// 構成概要:
// - Select (プロファイルリスト + 「プロファイルなし」選択肢)
// - ダーティ時にドットインジケータ表示
// - ボタン群: 保存 (上書き) / 新規作成 / 削除 / インポート / エクスポート
```

### 4.4 確認ダイアログ

```tsx
// src/features/ds-config/components/profile-confirm-dialog.tsx
// プロファイル切替時にダーティ状態なら表示
// 選択肢: 「保存して切替」「破棄して切替」「キャンセル」
```

### 4.5 名前入力ダイアログ

```tsx
// src/features/ds-config/components/profile-name-dialog.tsx
// プロファイル新規作成・リネーム時に表示
// 入力: プロファイル名 (必須、空文字不可、最大 50 文字)
```

### 4.6 インポート/エクスポート

```tsx
// src/features/ds-config/components/profile-import-export.tsx
// エクスポート: アクティブプロファイルを JSON ダウンロード
//   → services/export.ts の downloadFile を再利用する
// インポート: ファイル選択 → バリデーション → 新規プロファイルとして追加
```

### 4.7 JSON バリデーション

```typescript
// src/lib/validation.ts に追加
// validateProfileJson(json: unknown): ProfileData | { error: string }
// - $schema フィールドの値チェック
// - 各フィールドの型・範囲チェック (DsConfig / GameStartConfig / Timer0VCountRange 等)
// - MAC アドレス: 6 要素の 0-255 整数配列
// - TID/SID: 0-65535 整数 or undefined
// - Hardware / RomVersion / RomRegion / StartMode 等: 列挙値チェック
```

### 4.8 Store 間同期 (sync.ts)

```typescript
// stores/sync.ts に追加
import { useProfileStore } from './settings/profile';
import { useDsConfigStore } from './settings/ds-config';
import { useTrainerStore } from './settings/trainer';
import type { ProfileData } from './settings/profile';

function applyProfileData(data: ProfileData): void {
  useDsConfigStore.getState().replaceConfig(data.config);
  useDsConfigStore.getState().setRanges(data.ranges);
  useDsConfigStore.getState().setTimer0Auto(data.timer0Auto);
  // gameStart は setGameStart ではなく直接セット (normalize は不要、保存時の値をそのまま復元)
  useDsConfigStore.setState({ gameStart: data.gameStart });
  useTrainerStore.getState().setTrainer(data.tid, data.sid);
}

// setupStoreSyncSubscriptions() 内に追加:
// activeProfileId 変更 → 対応する ProfileData を ds-config / trainer に反映
const unsubProfile = useProfileStore.subscribe(
  (state) => state.activeProfileId,
  (activeId, prevId) => {
    if (activeId === prevId) return;
    if (!activeId) return;
    const profile = useProfileStore.getState().profiles.find((p) => p.id === activeId);
    if (profile) {
      applyProfileData(profile.data);
    }
  }
);
```

### 4.9 app.tsx の変更

```tsx
// src/app.tsx — sidebarContent に ProfileSelector を追加
const sidebarContent = (
  <div className="space-y-6">
    <ProfileSelector />      {/* 追加 */}
    <DsConfigForm />
    <TrainerConfigForm />
    <GameStartConfigForm />
  </div>
);
```

### 4.10 翻訳方針

UI ラベルは `<Trans>` / `t` マクロで Lingui を使用する。主な翻訳キー:

| キー (自然文) | 日本語 | 英語 |
|------|--------|------|
| `Profile` | プロファイル | Profile |
| `No profile` | プロファイルなし | No profile |
| `Save` | 保存 | Save |
| `Save as new` | 新規保存 | Save as new |
| `Delete` | 削除 | Delete |
| `Rename` | 名前変更 | Rename |
| `Import` | インポート | Import |
| `Export` | エクスポート | Export |
| `Profile name` | プロファイル名 | Profile name |
| `Unsaved changes` | 未保存の変更 | Unsaved changes |
| `Save and switch` | 保存して切替 | Save and switch |
| `Discard and switch` | 破棄して切替 | Discard and switch |
| `Cancel` | キャンセル | Cancel |
| `Profile saved` | プロファイルを保存しました | Profile saved |
| `Profile deleted` | プロファイルを削除しました | Profile deleted |
| `Profile imported` | プロファイルをインポートしました | Profile imported |
| `Invalid profile file` | 無効なプロファイルファイルです | Invalid profile file |

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/profile-store.test.ts`)

| テスト | 検証内容 |
|--------|----------|
| `createProfile` | プロファイル作成後、profiles 配列に追加され activeProfileId が新 ID になる |
| `saveActiveProfile` | アクティブプロファイルの data が更新され updatedAt が更新される |
| `renameProfile` | 指定 ID のプロファイル名が変更される |
| `deleteProfile` | 指定 ID のプロファイルが削除される。アクティブの場合 activeProfileId が undefined になる |
| `deleteProfile` (非アクティブ) | 削除後も activeProfileId が維持される |
| `importProfile` | 新規 ID が割り当てられてプロファイルリストに追加される |
| `setActiveProfileId` | activeProfileId が更新される |
| `reset` | 初期状態に戻る |

### 5.2 ユニットテスト (バリデーション)

| テスト | 検証内容 |
|--------|----------|
| 正常系 | 正しい JSON がパースされ ProfileData が返る |
| 不正な MAC | 6 要素でない / 範囲外の値 → エラー |
| 不正な列挙値 | Hardware / Version / Region が未知の値 → エラー |
| 欠損フィールド | 必須フィールドなし → エラー |
| TID/SID 範囲外 | 65536 以上 / 負値 → エラー |

### 5.3 コンポーネントテスト (`src/test/components/profile-selector.test.tsx`)

| テスト | 検証内容 |
|--------|----------|
| プロファイル一覧表示 | Store にセットしたプロファイルがドロップダウンに列挙される |
| 新規作成フロー | 「新規保存」→ 名前入力ダイアログ → 名前入力 → プロファイル作成 |

### 5.4 統合テスト

本機能は WASM / Worker を使用しないため、統合テストは不要。Store 間連携はユニットテストで「`applyProfileData` 後の ds-config / trainer Store の状態」としてカバーする。

## 6. 実装チェックリスト

- [ ] Profile Store (`stores/settings/profile.ts`) 新規作成
- [ ] `stores/settings/index.ts` に re-export 追加
- [ ] `use-profile` hook (`hooks/use-profile.ts`) 新規作成
- [ ] `ProfileSelector` コンポーネント新規作成
- [ ] `ProfileNameDialog` コンポーネント新規作成
- [ ] `ProfileConfirmDialog` コンポーネント新規作成
- [ ] `ProfileImportExport` コンポーネント新規作成
- [ ] `features/ds-config/index.ts` re-export 更新
- [ ] `app.tsx` に `ProfileSelector` 配置
- [ ] `stores/sync.ts` に Profile 同期追加
- [ ] `lib/validation.ts` に JSON バリデーション追加
- [ ] 翻訳キー追加 (`pnpm lingui:extract` → `messages.po` 編集 → `pnpm lingui:compile`)
- [ ] ユニットテスト: Profile Store
- [ ] ユニットテスト: JSON バリデーション
- [ ] コンポーネントテスト: ProfileSelector
- [ ] `spec/agent/architecture/state-management.md` Section 3.1 永続化対象一覧にプロファイルを追記
- [ ] `spec/agent/architecture/frontend-structure.md` stores/settings/ ツリーに `profile.ts` を追記
