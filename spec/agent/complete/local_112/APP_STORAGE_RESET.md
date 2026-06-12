# アプリ保存データ初期化 仕様書

## 1. 概要

### 1.1 目的

ユーザがブラウザに保存された 5genSearch-web の永続化データを画面操作で初期化できるようにする。破壊的な localStorage schema 変更や、保存済み設定の不整合が疑われる場合に、開発者ツールを開かず復旧できる導線を提供する。

初期化は 2 段階に分ける。通常の復旧ではプロファイル一覧を保持し、設定・各 feature 入力だけを初期化する。通常初期化後は、保持したプロファイルと初期化後の DS/Trainer 設定が食い違って見えないように、アクティブプロファイル選択を解除する。プロファイル自体が壊れている、または全データを削除したい場合のみ完全初期化を選べるようにする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| アプリ保存データ | 5genSearch-web が Zustand `persist` 経由で localStorage に保存する設定・プロファイル・feature 入力 |
| アプリ所有キー | 5genSearch-web が localStorage に保存する既知キー。例: `ds-config`, `trainer`, `ui-settings`, `profiles`, `feature:*` |
| 通常初期化 | プロファイル一覧を保持し、アクティブプロファイル選択を解除したうえで、設定・UI 設定・各 feature 入力を localStorage から削除する操作 |
| 完全初期化 | プロファイルを含むアプリ所有キーを localStorage から削除する操作 |
| 危険操作 | 元に戻せない保存データ削除操作。実行前に確認ダイアログを必須にする |

### 1.3 背景・問題

このリポジトリでは、公開前の破壊的な永続化変更は migration を書かず localStorage クリアで対応する方針を採っている。直近の Timer0/VCount Auto 再同期修正でも、既存 localStorage や profile に `timer0Auto=true` と古い `ranges` の組み合わせが保存済みの場合、読み込み時正規化は別スコープとして扱った。

現状、ユーザが保存済み状態を初期化するにはブラウザの開発者ツールやサイトデータ削除に頼る必要がある。これは復旧手順として説明しづらく、誤って同一 origin の別データを削除するリスクもある。

### 1.4 期待効果

| 項目 | 現状 | 変更後 |
|------|------|--------|
| 復旧導線 | 開発者ツールやブラウザ設定が必要 | アプリ内の「アプリについて」下部から初期化できる |
| プロファイル保護 | 手動削除では残すキーの判断が必要 | 通常初期化ではプロファイル一覧を保持し、選択状態だけ解除する |
| 削除範囲 | 手動操作では削除範囲が曖昧 | アプリ所有キーだけを削除し、通常/完全を選べる |
| 操作安全性 | 誤操作の余地がある | 確認ダイアログで削除対象と影響を明示する |
| サポート容易性 | localStorage 手動削除を案内する必要がある | 「設定と入力を初期化」または「すべての保存データを初期化」を案内できる |

### 1.5 着手条件

- About ページ (`src/features/about/components/about-page.tsx`) が存在すること。
- UI は Radix AlertDialog と既存 `Button` を使う。
- 初期化対象は 5genSearch-web が所有する localStorage キーに限定する。
- 実装時点では service worker、Cache Storage、IndexedDB は使用していないため対象外とする。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/services/app-storage-reset.ts` | 新規 | アプリ所有 localStorage キーの列挙・削除・reload 実行を提供する |
| `src/features/about/components/app-storage-reset-section.tsx` | 新規 | About ページ下部に表示する初期化セクションと確認ダイアログ |
| `src/features/about/components/about-page.tsx` | 修正 | 既存コンテンツの最下部に初期化セクションを追加する |
| `src/test/unit/services/app-storage-reset.test.ts` | 新規 | アプリ所有キーの抽出・削除対象の検証 |
| `src/test/components/features/about-page.test.tsx` | 新規 | 初期化セクション、確認ダイアログ、実行ボタンの表示を検証する |
| `src/i18n/locales/ja/messages.po` | 修正 | 初期化 UI 文言の日本語翻訳を追加する |
| `src/i18n/locales/en/messages.po` | 修正 | 初期化 UI 文言の英語翻訳を追加する |
| `src/i18n/locales/ja/messages.ts` | 生成更新 | `pnpm lingui:compile` の出力を更新する |
| `src/i18n/locales/en/messages.ts` | 生成更新 | `pnpm lingui:compile` の出力を更新する |

## 3. 設計方針

### 3.1 配置

初期化 UI は「アプリについて」ページの下部、免責事項の後に「保存データの初期化」セクションとして配置する。アプリ全体に影響する管理操作であり、通常の検索・生成ワークフローから離れた場所に置くことで誤操作を避ける。

表示は独立した `section` とし、カード入れ子にはしない。見出し、短い説明、2 種類の初期化ボタン、確認ダイアログの構成にする。

### 3.2 削除範囲

`localStorage.clear()` は使わない。同一 origin に将来別用途のキーが存在する可能性があるため、アプリ所有キーだけを削除する。

通常初期化の削除対象は以下とする。

| 種別 | キー |
|------|-----|
| DS 設定 | `ds-config` |
| トレーナー設定 | `trainer` |
| UI 設定 | `ui-settings` |
| 起動時刻検索 | `feature:datetime-search` |
| MT Seed 検索 | `feature:mtseed-search` |
| 孵化起動時刻検索 | `feature:egg-search` |
| ID 調整 | `feature:tid-adjust` |
| 針読み | `feature:needle` |
| ポケモンリスト | `feature:pokemon-list` |
| タマゴリスト | `feature:egg-list` |
| 将来の feature store | `feature:` prefix に一致する localStorage キー |

通常初期化では `profiles` キーを削除しない。ただし、永続化された profile state の `activeProfileId` は解除する。`profiles` キーをそのまま保持すると、reload 後にプロファイルが選択済みの表示になる一方で、`ds-config` / `trainer` は初期値に戻る可能性があるためである。既存の store 同期は `activeProfileId` の変更時に profile data を DS/Trainer store へ適用するため、reload 直後の再適用に頼らない。

完全初期化では上記に加えて `profiles` キーを削除する。

`feature:` prefix を含める理由は、将来 feature store が増えた時に初期化漏れを防ぐためである。`ds-config` など prefix を持たない設定 store は明示リストで管理する。プロファイルは復旧時に保持したいケースが多いため、通常初期化では一覧を削除しない。

プロファイルだけを削除したいケースは、既存のプロファイル UI から個別削除できるため本仕様の専用ボタンは設けない。

### 3.3 初期化実行フロー

初期化は以下の順序で行う。

1. ユーザが About ページ下部の初期化ボタンを押す。
2. AlertDialog で通常初期化または完全初期化の削除対象と影響を表示する。
3. ユーザが確認ボタンを押す。
4. `resetAppStorage(mode)` が対象キーを localStorage から削除する。通常初期化では `profiles` の `activeProfileId` も解除する。
5. 初期化に成功した場合だけ `window.location.reload()` でページを再読み込みする。
6. localStorage 操作に失敗した場合は reload せず、toast でエラーを表示する。
7. 各 Zustand store は永続化データがない状態で初期値から再生成される。

store の `reset()` / `resetForm()` を先に呼ばない。`persist` middleware が即座に初期値を書き戻すと、localStorage キー削除による schema 不整合の解消という目的が曖昧になるためである。再読み込みによって in-memory state も破棄する。

通常初期化で `profiles` の JSON parse または shape 検証に失敗した場合は、プロファイル保持と選択解除を安全に両立できないため初期化を中断する。この場合は「プロファイルを保持した初期化に失敗した」旨を表示し、必要であれば完全初期化を案内する。

### 3.4 実行対象外

以下は初期化対象外とする。

| 対象 | 理由 |
|------|------|
| 検索結果の in-memory state | ページ reload で自然に破棄される |
| Service Worker / Cache Storage | 現時点の状態永続化対象ではない |
| IndexedDB | 現時点で使用していない |
| ブラウザのダウンロードファイル | アプリ保存データではない |
| GitHub Pages / Vite の静的 asset cache | 状態不整合の原因ではない |

### 3.5 UI 文言

About ページ上の起動ボタンは既存の控えめな About ページの密度に合わせる。通常初期化は `variant="outline"`、完全初期化は `variant="outline"` に `text-destructive` 系の class を足す。確認ダイアログ内の実行ボタンだけ `buttonVariants({ variant: 'destructive' })` を使う。

ボタン群は `flex flex-col gap-2 sm:flex-row` で配置し、長い日本語ラベルが mobile 幅で潰れないようにする。アイコンを使う場合は `lucide-react` の `RotateCcw` を使い、テキスト付きボタン内の装飾アイコンは `aria-hidden="true"` を設定する。

候補文言:

| UI | 日本語 | 英語 |
|----|--------|------|
| section heading | 保存データの初期化 | Reset saved data |
| description | このブラウザに保存された設定や入力内容を初期化できます。プロファイルを残す操作と、すべて削除する操作を選べます。 | Reset settings and inputs saved in this browser. You can keep profiles or delete all saved data. |
| normal button | 設定と入力を初期化 | Reset settings and inputs |
| hard button | すべての保存データを初期化 | Reset all saved data |
| normal dialog title | 設定と入力を初期化しますか？ | Reset settings and inputs? |
| normal dialog description | プロファイル一覧は保持し、選択中のプロファイルは解除します。設定と各機能の入力内容を削除し、ページを再読み込みします。 | Profiles will be kept and the active profile selection will be cleared. Settings and feature inputs will be deleted, then the page will reload. |
| hard dialog title | すべての保存データを初期化しますか？ | Reset all saved data? |
| hard dialog description | プロファイルを含む保存データを削除します。この操作は元に戻せません。削除後、ページを再読み込みします。 | Profiles and all saved data will be deleted. This cannot be undone. The page will reload after deletion. |
| error title | 保存データを初期化できませんでした | Could not reset saved data |
| storage error description | ブラウザの保存領域にアクセスできませんでした。ブラウザ設定を確認してください。 | Could not access browser storage. Check browser settings. |
| profile state error description | プロファイルを保持した初期化に失敗しました。必要な場合は、すべての保存データを初期化してください。 | Could not reset while keeping profiles. Reset all saved data if needed. |
| cancel | キャンセル | Cancel |
| normal confirm | 設定と入力を初期化 | Reset settings and inputs |
| hard confirm | すべて初期化 | Reset all |

## 4. 実装仕様

### 4.1 `app-storage-reset.ts`

アプリ所有キーを定義し、削除対象の列挙と削除を関数化する。localStorage 操作は例外を捕捉し、UI が reload 可否を判断できる結果型を返す。

```typescript
type AppStorageResetMode = 'settings' | 'all';
type AppStorageResetFailureReason = 'storage-unavailable' | 'profile-state-invalid';

type AppStorageResetResult =
  | { ok: true; removedKeys: string[]; activeProfileCleared: boolean }
  | { ok: false; reason: AppStorageResetFailureReason };

const SETTINGS_STORAGE_KEYS = [
  'ds-config',
  'trainer',
  'ui-settings',
  'feature:datetime-search',
  'feature:mtseed-search',
  'feature:egg-search',
  'feature:tid-adjust',
  'feature:needle',
  'feature:pokemon-list',
  'feature:egg-list',
] as const;

const PROFILE_STORAGE_KEY = 'profiles';

function isSettingsStorageKey(key: string): boolean {
  return (
    SETTINGS_STORAGE_KEYS.includes(key as (typeof SETTINGS_STORAGE_KEYS)[number]) ||
    key.startsWith('feature:')
  );
}

function isAppStorageKey(key: string, mode: AppStorageResetMode): boolean {
  if (isSettingsStorageKey(key)) return true;
  return mode === 'all' && key === PROFILE_STORAGE_KEY;
}

function getAppStorageKeys(mode: AppStorageResetMode, storage: Storage = localStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && isAppStorageKey(key, mode)) {
      keys.push(key);
    }
  }
  return keys;
}

function clearActiveProfileSelection(storage: Storage): boolean {
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  if (raw === null) return true;

  const parsed = parseProfileStorage(raw);
  if (parsed === undefined) return false;

  storage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      state: {
        ...parsed.state,
        activeProfileId: undefined,
      },
    })
  );
  return true;
}

function resetAppStorage(
  mode: AppStorageResetMode,
  storage: Storage = localStorage
): AppStorageResetResult {
  try {
    if (mode === 'settings' && !clearActiveProfileSelection(storage)) {
      return { ok: false, reason: 'profile-state-invalid' };
    }

    const keys = getAppStorageKeys(mode, storage);
    for (const key of keys) {
      storage.removeItem(key);
    }
    return {
      ok: true,
      removedKeys: keys,
      activeProfileCleared: mode === 'settings',
    };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}
```

`parseProfileStorage()` は Zustand `persist` の保存形式を検証する helper とする。`state.profiles` が配列であることを最低条件とし、shape が不正な場合は通常初期化を中断する。完全初期化では `profiles` キー自体を削除するため、この parse は不要とする。

`resetAppStorageAndReload(mode)` は UI から呼ぶ薄い wrapper とする。テスト容易性のため、削除処理と reload は分離する。

```typescript
function resetAppStorageAndReload(mode: AppStorageResetMode): AppStorageResetResult {
  const result = resetAppStorage(mode);
  if (result.ok) {
    window.location.reload();
  }
  return result;
}
```

失敗時は reload しない。`AppStorageResetSection` 側で `toast.error()` を出し、確認ダイアログを閉じる。

削除ループ前に `keys` を配列化してから `removeItem()` する。`storage.length` と index は削除中に変化するため、列挙と削除を同じ loop に混在させない。

```typescript
function removeStorageKeys(keys: readonly string[], storage: Storage): void {
  for (const key of keys) {
    storage.removeItem(key);
  }
}
```

### 4.2 `AppStorageResetSection`

About ページ専用の小コンポーネントとして実装する。責務は UI と確認ダイアログに限定し、localStorage のキー判定は `app-storage-reset.ts` に委譲する。

```tsx
function AppStorageResetSection() {
  const [pendingMode, setPendingMode] = useState<AppStorageResetMode | undefined>(undefined);

  const handleConfirm = () => {
    if (pendingMode === undefined) return;
    const result = resetAppStorageAndReload(pendingMode);
    if (!result.ok) {
      toast.error(t`Could not reset saved data`, {
        description: resolveResetErrorDescription(result.reason),
      });
    }
  };

  return (
    <section className="space-y-3 border-t pt-6">
      {/* heading / description / outline trigger buttons / AlertDialog */}
    </section>
  );
}
```

確認ダイアログは `AlertDialog` を使い、`AlertDialogContent className="max-w-sm"` と `AlertDialogDescription` を設定する。実行ボタンは `buttonVariants({ variant: 'destructive' })` を使う。これは既存の `ProfileDeleteDialog` と同じ構成に合わせるためである。

### 4.3 `AboutPage` への追加

既存の `Disclaimer` セクションの後に `AppStorageResetSection` を追加する。

```tsx
<section className="space-y-2">
  {/* Disclaimer */}
</section>

<AppStorageResetSection />
```

### 4.4 i18n

既存方針に従い、UI 文言は Lingui の `Trans` / `t` 経由にする。

実装後に以下を実行してメッセージを更新する。

```powershell
pnpm lingui:extract
pnpm lingui:compile
```

翻訳ファイルは `ja` と `en` を更新する。生成済み `messages.ts` は `compile` の出力に従う。

## 5. テスト方針

### 5.1 service unit test

`src/test/unit/services/app-storage-reset.test.ts` を追加する。

| テスト | 検証内容 |
|--------|----------|
| settings mode keys | 通常初期化では `ds-config`, `trainer`, `ui-settings`, `feature:*` だけが対象になる |
| keep profile entries in settings mode | 通常初期化では `profiles.state.profiles` が削除されない |
| clear active profile in settings mode | 通常初期化では `profiles.state.activeProfileId` が解除される |
| all mode includes profiles | 完全初期化では `profiles` も削除される |
| preserve non-app key | `third-party` など非対象キーは削除されない |
| returns removed keys | `resetAppStorage()` が削除したキー一覧を返す |
| future feature key | `feature:new-feature` のような将来キーも削除対象になる |
| invalid profile state | 通常初期化で `profiles` の JSON または shape が不正な場合は失敗を返す |
| storage unavailable | `storage.key()` / `getItem()` / `setItem()` / `removeItem()` が例外を投げた場合は失敗を返す |
| reload on success only | `resetAppStorageAndReload()` は成功時だけ reload する |

### 5.2 component test

About ページまたは `AppStorageResetSection` のコンポーネントテストを追加する。

| テスト | 検証内容 |
|--------|----------|
| section rendering | About ページ下部に保存データ初期化セクションと 2 つの初期化ボタンが表示される |
| normal dialog opens | 通常初期化ボタン押下でプロファイル保持を説明する確認ダイアログが開く |
| hard dialog opens | 完全初期化ボタン押下でプロファイル削除を説明する確認ダイアログが開く |
| trigger button variants | ページ上のトリガーは控えめな `outline`、完全初期化は `text-destructive`、確認ボタンは `destructive` になる |
| cancel keeps data | キャンセルでは削除処理が呼ばれない |
| confirm clears data | 確認で mode 付きの `resetAppStorageAndReload()` が呼ばれる |
| failure shows toast | 初期化失敗時は error toast を表示し、reload しない |

reload を実行する実装関数は mock し、テスト中に実際の reload を起こさない。

### 5.3 手動確認

| シナリオ | 期待結果 |
|----------|----------|
| DS 設定を変更後、通常初期化を実行 | reload 後に DS 設定が初期値へ戻る |
| アクティブプロファイル選択中に通常初期化を実行 | reload 後もプロファイル一覧は残り、プロファイル選択は「プロファイルなし」になる |
| プロファイル作成後、完全初期化を実行 | reload 後にプロファイルが空になる |
| 各 feature の入力値を変更後、通常初期化を実行 | reload 後に各 feature の入力値が初期値へ戻る |
| 非対象 localStorage キーを追加後、完全初期化を実行 | 非対象キーは残る |
| `profiles` に不正 JSON を入れて通常初期化を実行 | reload せず、初期化失敗 toast が表示される |

### 5.4 検証コマンド

```powershell
pnpm test:run src/test/unit/services/app-storage-reset.test.ts src/test/components/features/about-page.test.tsx
pnpm exec tsc -b --noEmit
pnpm lint:ts
pnpm format:check:ts
git diff --check
```

## 6. 実装チェックリスト

- [x] `src/services/app-storage-reset.ts` を追加する
- [x] 通常初期化と完全初期化の mode 型を定義する
- [x] 設定・入力系 localStorage キーの明示リストを定義する
- [x] 通常初期化時に `profiles.state.profiles` を保持し、`activeProfileId` を解除する
- [x] 完全初期化時だけ `profiles` を削除対象に含める
- [x] `feature:` prefix キーを将来 feature store として削除対象に含める
- [x] `resetAppStorage(mode)` と `resetAppStorageAndReload(mode)` を実装する
- [x] localStorage 操作失敗時に reload せず error toast を表示する
- [x] `AppStorageResetSection` を実装する
- [x] About ページ下部に「保存データの初期化」セクションを追加する
- [x] 通常初期化と完全初期化の 2 ボタンを配置する
- [x] AlertDialog で破壊的操作の確認を必須にする
- [x] Lingui メッセージを抽出・翻訳・compile し、`messages.po` と `messages.ts` を更新する
- [x] service unit test を追加する
- [x] component test を追加する
- [x] TypeScript、lint、format、unit test で検証する
