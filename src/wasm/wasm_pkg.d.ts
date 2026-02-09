/* tslint:disable */
/* eslint-disable */
/**
 * 1日内の時刻範囲
 */
export interface TimeRangeParams {
    hour_start: number;
    hour_end: number;
    minute_start: number;
    minute_end: number;
    second_start: number;
    second_end: number;
}

/**
 * DS ハードウェア種別
 */
export type Hardware = "Ds" | "DsLite" | "Dsi" | "Dsi3ds";

/**
 * DS ボタン
 *
 * DS 本体のボタンを表す列挙型。
 * 各ボタンは SHA-1 計算で使用されるビットマスクを持つ。
 */
export type DsButton = "A" | "B" | "X" | "Y" | "L" | "R" | "Start" | "Select" | "Up" | "Down" | "Left" | "Right";

/**
 * DS 本体設定
 */
export interface DsConfig {
    mac: [number, number, number, number, number, number];
    hardware: Hardware;
    version: RomVersion;
    region: RomRegion;
}

/**
 * GPU デバイスの種類
 */
export type GpuKind = "Discrete" | "Integrated" | "Mobile" | "Unknown";

/**
 * GPU プロファイル
 *
 * デバイス情報と最適化パラメータを保持する。
 */
export interface GpuProfile {
    /**
     * GPU の種類
     */
    kind: GpuKind;
    /**
     * デバイス名
     */
    name: string;
    /**
     * ベンダー名
     */
    vendor: string;
    /**
     * ドライバー情報
     */
    driver: string;
}

/**
 * GPU 検索バッチ結果
 *
 * CPU 側と同様に処理件数のみを返し、スループット計算は TS 側の責務とする。
 */
export interface GpuSearchBatch {
    /**
     * 検索結果
     */
    results: SeedOrigin[];
    /**
     * 進捗率 (0.0 - 1.0)
     */
    progress: number;
    /**
     * 処理済み数
     */
    processed_count: bigint;
    /**
     * 総処理数
     */
    total_count: bigint;
}

/**
 * IV フィルタ条件
 *
 * 各ステータスの範囲指定に加え、めざめるパワーのタイプ・威力条件を指定可能。
 */
export interface IvFilter {
    /**
     * HP (min, max)
     */
    hp: [number, number];
    /**
     * 攻撃 (min, max)
     */
    atk: [number, number];
    /**
     * 防御 (min, max)
     */
    def: [number, number];
    /**
     * 特攻 (min, max)
     */
    spa: [number, number];
    /**
     * 特防 (min, max)
     */
    spd: [number, number];
    /**
     * 素早さ (min, max)
     */
    spe: [number, number];
    /**
     * めざパタイプ条件 (指定タイプのいずれかに一致)
     */
    hidden_power_types?: HiddenPowerType[] | undefined;
    /**
     * めざパ威力下限 (30-70)
     */
    hidden_power_min_power?: number | undefined;
}

/**
 * LCG Seed (64bit)
 *
 * SHA-1 ハッシュから導出される初期シード。
 * `large_number_types_as_bigints` により TypeScript では bigint として扱われる。
 */
export type LcgSeed = bigint;

/**
 * MT Seed (32bit)
 *
 * LCG から導出される MT19937 初期シード。
 * u32 は JavaScript の safe integer 範囲内のため number として扱われる。
 */
export type MtSeed = number;

/**
 * MT Seed 検索コンテキスト (ユーザー入力用)
 *
 * TS 側が組み立てる入力型。検索範囲は含まない。
 * `generate_mtseed_iv_search_tasks` に渡すと、範囲付きの `MtseedSearchParams` に変換される。
 */
export interface MtseedSearchContext {
    /**
     * IV フィルタ条件
     */
    iv_filter: IvFilter;
    /**
     * MT オフセット (IV 生成開始位置、通常 7)
     */
    mt_offset: number;
    /**
     * 徘徊ポケモンモード
     */
    is_roamer: boolean;
}

/**
 * MT Seed 検索バッチ結果
 */
export interface MtseedDatetimeSearchBatch {
    /**
     * 見つかった結果 (`SeedOrigin::Startup` 形式)
     */
    results: SeedOrigin[];
    /**
     * 処理済み件数
     */
    processed_count: bigint;
    /**
     * 総件数
     */
    total_count: bigint;
}

/**
 * MT Seed 検索バッチ結果
 */
export interface MtseedSearchBatch {
    /**
     * 条件を満たした候補
     */
    candidates: MtseedResult[];
    /**
     * 処理済み Seed 数
     */
    processed: bigint;
    /**
     * 総 Seed 数 (0x100000000)
     */
    total: bigint;
}

/**
 * MT Seed 検索パラメータ (タスク用)
 *
 * タスク分割後の各 Worker に渡されるパラメータ。
 * `start_seed` / `end_seed` は閉区間 `[start_seed, end_seed]` を表す。
 */
export interface MtseedSearchParams {
    /**
     * IV フィルタ条件
     */
    iv_filter: IvFilter;
    /**
     * MT オフセット (IV 生成開始位置、通常 7)
     */
    mt_offset: number;
    /**
     * 徘徊ポケモンモード
     */
    is_roamer: boolean;
    /**
     * 検索開始 Seed (inclusive)
     */
    start_seed: number;
    /**
     * 検索終了 Seed (inclusive)
     */
    end_seed: number;
}

/**
 * MT Seed 検索パラメータ (単一組み合わせ)
 */
export interface MtseedDatetimeSearchParams {
    /**
     * 検索対象の MT Seed セット
     */
    target_seeds: MtSeed[];
    /**
     * DS 設定
     */
    ds: DsConfig;
    /**
     * 1日内の時刻範囲
     */
    time_range: TimeRangeParams;
    /**
     * 検索範囲 (秒単位)
     */
    search_range: SearchRangeParams;
    /**
     * 起動条件 (単一)
     */
    condition: StartupCondition;
}

/**
 * MT Seed 検索結果
 */
export interface MtseedResult {
    /**
     * 一致した MT Seed
     */
    seed: MtSeed;
    /**
     * 生成された IV
     */
    ivs: Ivs;
}

/**
 * ROM バージョン
 */
export type RomVersion = "Black" | "White" | "Black2" | "White2";

/**
 * ROM リージョン
 */
export type RomRegion = "Jpn" | "Kor" | "Usa" | "Ger" | "Fra" | "Spa" | "Ita";

/**
 * Seed 指定仕様
 *
 * Generator 系 API 用の Seed 指定方法。
 * `KeySpec` と同様に、仕様から `SeedOrigin` リストに展開される。
 */
export type SeedSpec = { type: "Seeds"; seeds: LcgSeed[] } | { type: "Startup"; ds: DsConfig; datetime: Datetime; ranges: Timer0VCountRange[]; key_input: KeyInput };

/**
 * `Timer0` / `VCount` 範囲
 *
 * 固定値指定は min = max で表現。
 * `VCount` ごとに異なる `Timer0` 範囲を持つ場合は、複数の Range を配列で持つ。
 */
export interface Timer0VCountRange {
    timer0_min: number;
    timer0_max: number;
    vcount_min: number;
    vcount_max: number;
}

/**
 * `TrainerInfo` 検索バッチ結果
 */
export interface TrainerInfoSearchBatch {
    /**
     * 見つかった結果
     */
    results: TrainerInfoSearchResult[];
    /**
     * 処理済み件数
     */
    processed_count: bigint;
    /**
     * 総件数
     */
    total_count: bigint;
}

/**
 * `TrainerInfo` 検索パラメータ (単一組み合わせ)
 */
export interface TrainerInfoSearchParams {
    /**
     * 検索フィルタ
     */
    filter: TrainerInfoFilter;
    /**
     * DS 設定 (`RomVersion` を含む)
     */
    ds: DsConfig;
    /**
     * 1日内の時刻範囲
     */
    time_range: TimeRangeParams;
    /**
     * 検索範囲 (秒単位)
     */
    search_range: SearchRangeParams;
    /**
     * 起動条件 (単一: Timer0/VCount/KeyCode)
     */
    condition: StartupCondition;
    /**
     * 起動設定
     */
    game_start: GameStartConfig;
}

/**
 * `TrainerInfo` 検索フィルタ
 *
 * TID/SID の完全一致、または `ShinyPID` による色違い判定を行う。
 */
export interface TrainerInfoFilter {
    /**
     * 検索対象の TID (None で条件なし)
     */
    tid: number | undefined;
    /**
     * 検索対象の SID (None で条件なし)
     */
    sid: number | undefined;
    /**
     * 色違いにしたい個体の PID (None で条件なし)
     */
    shiny_pid: Pid | undefined;
}

/**
 * `TrainerInfo` 検索結果
 */
export interface TrainerInfoSearchResult {
    /**
     * TID + SID
     */
    trainer: TrainerInfo;
    /**
     * 生成元情報 (`Datetime` + `StartupCondition`)
     */
    seed_origin: SeedOrigin;
    /**
     * 色違いタイプ (`shiny_pid` 指定時のみ有効)
     */
    shiny_type: ShinyType | undefined;
}

/**
 * かわらずのいし効果
 */
export type EverstonePlan = "None" | { Fixed: Nature };

/**
 * ひかるおまもりの所持状態 (BW2 のみ有効)
 */
export type ShinyCharmState = "NotObtained" | "Obtained";

/**
 * めざめるパワーのタイプ
 */
export type HiddenPowerType = "Fighting" | "Flying" | "Poison" | "Ground" | "Rock" | "Bug" | "Ghost" | "Steel" | "Fire" | "Water" | "Grass" | "Electric" | "Psychic" | "Ice" | "Dragon" | "Dark";

/**
 * アイテム内容 (`DustCloud` / `PokemonShadow` 用)
 */
export type ItemContent = "EvolutionStone" | "Jewel" | "Everstone" | "Feather";

/**
 * エンカウントスロット設定
 */
export interface EncounterSlotConfig {
    /**
     * ポケモン種族 ID
     */
    species_id: number;
    /**
     * 最小レベル
     */
    level_min: number;
    /**
     * 最大レベル
     */
    level_max: number;
    /**
     * 性別比
     */
    gender_ratio: GenderRatio;
    /**
     * 所持アイテムあり
     */
    has_held_item: boolean;
    /**
     * 色違いロック
     */
    shiny_locked: boolean;
}

/**
 * エンカウント方法
 */
export type EncounterMethod = "Stationary" | "Moving";

/**
 * エンカウント種別
 */
export type EncounterType = "Normal" | "ShakingGrass" | "DustCloud" | "PokemonShadow" | "Surfing" | "SurfingBubble" | "Fishing" | "FishingBubble" | "StaticSymbol" | "StaticStarter" | "StaticFossil" | "StaticEvent" | "Roamer" | "HiddenGrotto" | "Egg";

/**
 * エンカウント結果 (`DustCloud` / `PokemonShadow` / `Fishing` 用)
 */
export type EncounterResult = { type: "Pokemon" } | { type: "Item"; item: ItemContent } | { type: "FishingFailed" };

/**
 * キー入力 (Generator 用)
 *
 * 固定のボタン組み合わせを指定し、単一の `KeyCode` を生成。
 * Generator 系 API で使用する。
 */
export interface KeyInput {
    buttons: DsButton[];
}

/**
 * キー入力コード (SHA-1 計算用)
 *
 * `KeyMask` を XOR `0x2FFF` で変換した値。
 * ゲーム内部の SHA-1 メッセージ生成で使用される。
 */
export type KeyCode = number;

/**
 * キー入力仕様 (Searcher 用)
 *
 * 利用可能なボタンを指定し、全組み合わせを探索。
 * Searcher 系 API で使用する。
 *
 * 組み合わせ生成時に以下の無効パターンは自動除外:
 * - 上下同時押し (Up + Down)
 * - 左右同時押し (Left + Right)
 * - L+R+Start+Select 同時押し (ソフトリセットコマンド)
 */
export interface KeySpec {
    available_buttons: DsButton[];
}

/**
 * セーブデータの有無
 */
export type SavePresence = "NoSave" | "WithSave";

/**
 * トレーナー情報
 */
export interface TrainerInfo {
    /**
     * トレーナー ID
     */
    tid: number;
    /**
     * 裏 ID
     */
    sid: number;
}

/**
 * ポケモン/卵の共通個体情報
 */
export interface CorePokemonData {
    /**
     * 性格値
     */
    pid: Pid;
    /**
     * 性格
     */
    nature: Nature;
    /**
     * 特性スロット
     */
    ability_slot: AbilitySlot;
    /**
     * 性別
     */
    gender: Gender;
    /**
     * 色違い種別
     */
    shiny_type: ShinyType;
    /**
     * 個体値
     */
    ivs: Ivs;
    /**
     * 種族 ID
     * - ポケモン: 常に設定
     * - 卵: 常に 0 (外部指定が必要)
     */
    species_id: number;
    /**
     * レベル
     * - ポケモン: 生成時に決定
     * - 卵: 常に 1
     */
    level: number;
}

/**
 * ポケモンの性格値 (Personality ID)
 *
 * TypeScript では `export type Pid = number` として公開される。
 */
export type Pid = number;

/**
 * ポケモンフィルター (野生/固定用)
 *
 * `CoreDataFilter` に加え、種族・レベル条件をサポート。
 */
export interface PokemonFilter extends CoreDataFilter {
    /**
     * 種族 ID (複数指定可、いずれかに一致)
     */
    species_ids: number[] | undefined;
    /**
     * レベル範囲 (min, max)
     */
    level_range: [number, number] | undefined;
}

/**
 * ポケモン生成パラメータ
 *
 * `GenerationConfig` を含まない。生成条件のみを定義。
 */
export interface PokemonGenerationParams {
    /**
     * トレーナー情報
     */
    trainer: TrainerInfo;
    /**
     * エンカウント種別
     */
    encounter_type: EncounterType;
    /**
     * エンカウント方法 (Wild のみ有効、Static は `Stationary` 固定)
     */
    encounter_method: EncounterMethod;
    /**
     * 先頭特性効果
     */
    lead_ability: LeadAbilityEffect;
    /**
     * エンカウントスロット (Wild: 複数、Static: 1件)
     */
    slots: EncounterSlotConfig[];
}

/**
 * レポート針パターン
 *
 * `Vec<NeedleDirection>` のラッパー。型レベルで 0-7 範囲を保証。
 */
export type NeedlePattern = NeedleDirection[];

/**
 * レポート針パターン検索結果
 */
export interface NeedleSearchResult {
    /**
     * パターン末尾消費位置 (`game_offset` からの相対)
     */
    advance: number;
    /**
     * 生成元情報
     */
    source: SeedOrigin;
}

/**
 * レポート針方向 (0-7)
 *
 * 8 方向の針位置を表す。計算結果やパターン指定に使用。
 */
export type NeedleDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

/**
 * 個体値セット (構造体版)
 *
 * 各フィールドは 0-31 の通常値、または 32 (Unknown) を取る。
 * TypeScript 側では `{ hp: number, atk: number, ... }` として扱われる。
 */
export interface Ivs {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
}

/**
 * 先頭ポケモンの特性効果
 */
export type LeadAbilityEffect = "None" | { Synchronize: Nature } | "CompoundEyes";

/**
 * 卵生成パラメータ
 *
 * `GenerationConfig` を含まない。生成条件のみを定義。
 */
export interface EggGenerationParams {
    /**
     * トレーナー情報
     */
    trainer: TrainerInfo;
    /**
     * かわらずのいし効果
     */
    everstone: EverstonePlan;
    /**
     * メス親が夢特性か
     */
    female_has_hidden: boolean;
    /**
     * メタモン使用
     */
    uses_ditto: boolean;
    /**
     * 性別比率
     */
    gender_ratio: GenderRatio;
    /**
     * ニドラン♀フラグ
     */
    nidoran_flag: boolean;
    /**
     * 国際孵化 (Masuda Method)
     */
    masuda_method: boolean;
    /**
     * オス親の個体値
     */
    parent_male: Ivs;
    /**
     * メス親の個体値
     */
    parent_female: Ivs;
    /**
     * NPC消費を考慮するか
     */
    consider_npc: boolean;
    /**
     * 孵化対象の種族 ID (オプション)
     *
     * - `Some(id)`: 指定した種族として `core.species_id` を設定
     * - `None`: 従来通り `species_id = 0` (未指定)
     *
     * ニドラン♀ (#29) / イルミーゼ (#314) を指定した場合、
     * 性別に応じて自動的に ニドラン♂ (#32) / バルビート (#313) に変換される。
     */
    species_id: number | undefined;
}

/**
 * 孵化フィルター
 *
 * `CoreDataFilter` に加え、猶予フレーム条件をサポート。
 */
export interface EggFilter extends CoreDataFilter {
    /**
     * 猶予フレーム最小値 (NPC消費考慮時)
     */
    min_margin_frames: number | undefined;
}

/**
 * 孵化検索バッチ結果
 */
export interface EggDatetimeSearchBatch {
    /**
     * 見つかった結果
     */
    results: EggDatetimeSearchResult[];
    /**
     * 処理済み件数
     */
    processed_count: bigint;
    /**
     * 総件数
     */
    total_count: bigint;
}

/**
 * 孵化検索結果
 *
 * `GeneratedEggData` に起動条件 (`SeedOrigin::Startup`) が含まれるため、
 * 追加フィールドは不要。
 */
export interface EggDatetimeSearchResult {
    /**
     * 生成された孵化個体データ
     *
     * `source` フィールドに `SeedOrigin::Startup` が格納されており、
     * 起動日時・条件を取得可能。
     */
    egg: GeneratedEggData;
}

/**
 * 孵化起動時刻検索パラメータ
 */
export interface EggDatetimeSearchParams {
    /**
     * DS 設定
     */
    ds: DsConfig;
    /**
     * 1日内の時刻範囲
     */
    time_range: TimeRangeParams;
    /**
     * 検索範囲 (秒単位)
     */
    search_range: SearchRangeParams;
    /**
     * 起動条件 (単一)
     */
    condition: StartupCondition;
    /**
     * 孵化生成パラメータ
     */
    egg_params: EggGenerationParams;
    /**
     * 生成共通設定
     */
    gen_config: GenerationConfig;
    /**
     * フィルター (None の場合は全件返却)
     */
    filter: EggFilter | undefined;
}

/**
 * 完全な個体データ
 */
export interface GeneratedPokemonData {
    advance: number;
    needle_direction: NeedleDirection;
    /**
     * 生成元情報
     */
    source: SeedOrigin;
    core: CorePokemonData;
    sync_applied: boolean;
    held_item_slot: HeldItemSlot;
    /**
     * 移動エンカウント情報 (Normal/Surfing + Moving 時のみ Some)
     */
    moving_encounter: MovingEncounterInfo | undefined;
    /**
     * 特殊エンカウント情報 (ShakingGrass/DustCloud/SurfingBubble/FishingBubble/PokemonShadow 時のみ Some)
     */
    special_encounter: SpecialEncounterInfo | undefined;
    /**
     * エンカウント結果 (DustCloud/PokemonShadow 時に使用。通常は Pokemon)
     */
    encounter_result: EncounterResult;
}

/**
 * 完全な卵データ
 */
export interface GeneratedEggData {
    advance: number;
    needle_direction: NeedleDirection;
    /**
     * 生成元情報
     */
    source: SeedOrigin;
    core: CorePokemonData;
    /**
     * 遺伝情報 (配列化)
     */
    inheritance: [InheritanceSlot, InheritanceSlot, InheritanceSlot];
    /**
     * NPC消費による猶予フレーム (`consider_npc` = false 時は None)
     */
    margin_frames: number | undefined;
}

/**
 * 思い出リンクの状態 (BW2 のみ有効)
 */
export type MemoryLinkState = "Disabled" | "Enabled";

/**
 * 性別
 */
export type Gender = "Male" | "Female" | "Genderless";

/**
 * 性別比
 */
export type GenderRatio = "Genderless" | "MaleOnly" | "FemaleOnly" | "F1M7" | "F1M3" | "F1M1" | "F3M1";

/**
 * 性格
 */
export type Nature = "Hardy" | "Lonely" | "Brave" | "Adamant" | "Naughty" | "Bold" | "Docile" | "Relaxed" | "Impish" | "Lax" | "Timid" | "Hasty" | "Serious" | "Jolly" | "Naive" | "Modest" | "Mild" | "Quiet" | "Bashful" | "Rash" | "Calm" | "Gentle" | "Sassy" | "Careful" | "Quirky";

/**
 * 持ち物スロット
 */
export type HeldItemSlot = "Common" | "Rare" | "VeryRare" | "None";

/**
 * 日付範囲パラメータ (UI 入力用)
 *
 * 開始日〜終了日を表す。`SearchRangeParams` と異なり、
 * UI からの入力に適した形式。`to_search_range()` で変換可能。
 */
export interface DateRangeParams {
    /**
     * 開始年 (2000-2099)
     */
    start_year: number;
    /**
     * 開始月 (1-12)
     */
    start_month: number;
    /**
     * 開始日 (1-31)
     */
    start_day: number;
    /**
     * 終了年 (2000-2099)
     */
    end_year: number;
    /**
     * 終了月 (1-12)
     */
    end_month: number;
    /**
     * 終了日 (1-31)
     */
    end_day: number;
}

/**
 * 検索範囲
 */
export interface SearchRangeParams {
    start_year: number;
    start_month: number;
    start_day: number;
    /**
     * 開始日内のオフセット秒 (0-86399)
     */
    start_second_offset: number;
    /**
     * 検索範囲秒数
     */
    range_seconds: number;
}

/**
 * 特性スロット
 */
export type AbilitySlot = "First" | "Second" | "Hidden";

/**
 * 特殊エンカウント情報
 */
export interface SpecialEncounterInfo {
    /**
     * 発生するか (10% 判定結果)
     */
    triggered: boolean;
    /**
     * 発生方向 (triggered = true の場合のみ有効)
     */
    direction: SpecialEncounterDirection;
    /**
     * 発生判定に使用した乱数値
     */
    trigger_rand: number;
    /**
     * 方向決定に使用した乱数値
     */
    direction_rand: number;
}

/**
 * 特殊エンカウント発生方向
 */
export type SpecialEncounterDirection = "Right" | "Up" | "Left" | "Down";

/**
 * 生成元情報
 *
 * 生成結果のソース情報。各エントリがどの条件から生成されたかを示す。
 */
export type SeedOrigin = { Seed: { base_seed: LcgSeed; mt_seed: MtSeed } } | { Startup: { base_seed: LcgSeed; mt_seed: MtSeed; datetime: Datetime; condition: StartupCondition } };

/**
 * 生成共通設定
 *
 * オフセット計算と検索範囲を定義。
 */
export interface GenerationConfig {
    /**
     * ROM バージョン (`game_offset` 計算用)
     */
    version: RomVersion;
    /**
     * 起動設定 (`game_offset` 計算用)
     */
    game_start: GameStartConfig;
    /**
     * 検索開始位置 (advance の初期値)
     */
    user_offset: number;
    /**
     * 検索終了位置
     */
    max_advance: number;
}

/**
 * 生成結果の共通フィルター条件
 *
 * `CorePokemonData` に対応するフィルター。
 * 各フィールドが `None` の場合は条件なし (全件通過)。
 */
export interface CoreDataFilter {
    /**
     * IV フィルター
     */
    iv: IvFilter | undefined;
    /**
     * 性格 (複数指定可、いずれかに一致)
     */
    natures: Nature[] | undefined;
    /**
     * 性別
     */
    gender: Gender | undefined;
    /**
     * 特性スロット
     */
    ability_slot: AbilitySlot | undefined;
    /**
     * 色違い
     */
    shiny: ShinyFilter | undefined;
}

/**
 * 移動エンカウント判定結果
 */
export type MovingEncounterLikelihood = "Guaranteed" | "Possible" | "NoEncounter";

/**
 * 移動エンカウント情報
 */
export interface MovingEncounterInfo {
    /**
     * 判定結果
     */
    likelihood: MovingEncounterLikelihood;
    /**
     * 判定に使用した乱数値
     */
    rand_value: number;
}

/**
 * 色違いフィルター
 */
export type ShinyFilter = "Shiny" | "Star" | "Square";

/**
 * 色違い種別
 */
export type ShinyType = "None" | "Star" | "Square";

/**
 * 表示用ポケモンデータ (解決済み)
 */
export interface UiPokemonData {
    advance: number;
    needle_direction: number;
    /**
     * e.g., `\"1234567890ABCDEF\"`
     */
    base_seed: string;
    /**
     * e.g., `\"12345678\"`
     */
    mt_seed: string;
    /**
     * 起動条件 (`SeedOrigin::Startup` の場合のみ `Some`)
     */
    datetime_iso: string | undefined;
    /**
     * e.g., `\"0C80\"`
     */
    timer0: string | undefined;
    /**
     * e.g., `\"5E\"`
     */
    vcount: string | undefined;
    key_input: string | undefined;
    species_name: string;
    nature_name: string;
    ability_name: string;
    /**
     * `\"♂\"` / `\"♀\"` / `\"-\"`
     */
    gender_symbol: string;
    /**
     * `\"\"` / `\"◇\"` / `\"☆\"`
     */
    shiny_symbol: string;
    level: number;
    /**
     * 個体値 (表示用文字列)
     *   - 通常: `\"31\"`, `\"0\"` など
     *   - 不明時: `\"?\"` (卵の遺伝未確定など)
     *   - 順序: `[H, A, B, C, D, S]`
     */
    ivs: [string, string, string, string, string, string];
    /**
     * ステータス (表示用文字列)
     *   - 通常: `\"187\"`, `\"100\"` など
     *   - 不明時: `\"?\"` (IV 不明または `species_id` 未指定)
     *   - 順序: `[H, A, B, C, D, S]`
     */
    stats: [string, string, string, string, string, string];
    /**
     * めざパタイプ (表示用文字列)
     *   - 通常: `\"ドラゴン\"` / `\"Dragon\"` など
     *   - 不明時: `\"?\"`
     */
    hidden_power_type: string;
    /**
     * めざパ威力 (表示用文字列)
     *   - 通常: `\"70\"` など
     *   - 不明時: `\"?\"`
     */
    hidden_power_power: string;
    /**
     * 性格値 (prefix無し16進数)
     *   - e.g., `\"12345678\"`
     */
    pid: string;
    sync_applied: boolean;
    held_item_name: string | undefined;
    /**
     * 移動エンカウント確定状態 (表示用文字列)
     *   - `\"〇\"`: 確定エンカウント (`Guaranteed`)
     *   - `\"?\"`: 歩数次第 (`Possible`, BW2 のみ)
     *   - `\"×\"`: エンカウント無し (`NoEncounter`)
     */
    moving_encounter_guaranteed: string | undefined;
    /**
     * 特殊エンカウント発生 (表示用文字列)
     *   - `\"〇\"`: 発生する (`triggered = true`)
     *   - `\"×\"`: 発生しない (`triggered = false`)
     */
    special_encounter_triggered: string | undefined;
    special_encounter_direction: string | undefined;
    /**
     * `\"Pokemon\"` / `\"Item:EvolutionStone\"` / etc.
     */
    encounter_result: string;
}

/**
 * 表示用卵データ (解決済み)
 */
export interface UiEggData {
    advance: number;
    needle_direction: number;
    base_seed: string;
    mt_seed: string;
    datetime_iso: string | undefined;
    timer0: string | undefined;
    vcount: string | undefined;
    key_input: string | undefined;
    /**
     * 種族名 (`species_id` が指定された場合のみ)
     */
    species_name: string | undefined;
    nature_name: string;
    /**
     * 特性名
     *   - `species_id` 指定時: 種族データから解決した確定特性名 (e.g., `\"しぜんかいふく\"`)
     *   - `species_id` 未指定時: スロット名 (`\"特性1\"` / `\"特性2\"` / `\"夢特性\"`)
     */
    ability_name: string;
    gender_symbol: string;
    shiny_symbol: string;
    /**
     * 常に 1
     */
    level: number;
    /**
     * 個体値 (表示用文字列)
     *   - 確定時: `\"31\"`, `\"0\"` など
     *   - 遺伝未確定時: `\"?\"` (`IV_VALUE_UNKNOWN` の場合)
     */
    ivs: [string, string, string, string, string, string];
    /**
     * ステータス (表示用文字列)
     *   - 計算可能時: `\"12\"`, `\"8\"` など (Lv.1 時点)
     *   - 計算不可時: `\"?\"` (IV 不明 or `species_id` 未指定)
     */
    stats: [string, string, string, string, string, string];
    /**
     * めざパタイプ (表示用文字列)
     */
    hidden_power_type: string;
    /**
     * めざパ威力 (表示用文字列)
     */
    hidden_power_power: string;
    /**
     * 性格値 (prefix無し16進数)
     *   - e.g., `\"12345678\"`
     */
    pid: string;
    margin_frames: number | undefined;
}

/**
 * 起動方法
 */
export type StartMode = "NewGame" | "Continue";

/**
 * 起動日時 (Generator 専用)
 *
 * 固定の起動時刻を指定。Searcher は `DateRange` / `TimeRange` を使用。
 */
export interface Datetime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

/**
 * 起動時刻検索の共通コンテキスト
 */
export interface DatetimeSearchContext {
    /**
     * DS 設定
     */
    ds: DsConfig;
    /**
     * 日付範囲 (開始日〜終了日)
     */
    date_range: DateRangeParams;
    /**
     * 1日内の時刻範囲
     */
    time_range: TimeRangeParams;
    /**
     * Timer0/VCount 範囲 (複数指定可能)
     */
    ranges: Timer0VCountRange[];
    /**
     * キー入力仕様 (全組み合わせを探索)
     */
    key_spec: KeySpec;
}

/**
 * 起動条件 (`Timer0` / `VCount` / `KeyCode` の組み合わせ)
 *
 * 起動時刻検索結果や `SeedOrigin::Startup` で使用される共通型。
 */
export interface StartupCondition {
    timer0: number;
    vcount: number;
    key_code: KeyCode;
}

/**
 * 起動設定
 */
export interface GameStartConfig {
    start_mode: StartMode;
    save: SavePresence;
    memory_link: MemoryLinkState;
    shiny_charm: ShinyCharmState;
}

/**
 * 遺伝スロット
 */
export interface InheritanceSlot {
    /**
     * 遺伝先ステータス (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
     */
    stat: number;
    /**
     * 遺伝元親 (0=Male, 1=Female)
     */
    parent: number;
}


/**
 * 孵化起動時刻検索器
 */
export class EggDatetimeSearcher {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * 新しい `EggDatetimeSearcher` を作成
     *
     * # Errors
     *
     * - `time_range` のバリデーション失敗
     */
    constructor(params: EggDatetimeSearchParams);
    /**
     * 次のバッチを検索
     */
    next_batch(chunk_count: number): EggDatetimeSearchBatch;
    readonly is_done: boolean;
    readonly progress: number;
}

/**
 * GPU 起動時刻検索イテレータ
 *
 * `AsyncIterator` パターンで GPU 検索を実行する。
 * `next()` を呼び出すたびに最適バッチサイズで GPU ディスパッチを実行し、
 * 結果・進捗・スループットを返す。
 *
 * 複数の `StartupCondition` (`Timer0` × `VCount` × `KeyCode`) を順次処理し、
 * 全体の進捗を統合して報告する。
 */
export class GpuDatetimeSearchIterator {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * イテレータを作成 (複数組み合わせ対応、WASM 公開 API)
     *
     * `DatetimeSearchContext` から組み合わせを展開し、順次処理する。
     *
     * # Errors
     *
     * - GPU デバイスが利用不可の場合
     * - `target_seeds` が空の場合
     * - 組み合わせが空の場合
     */
    static create(context: DatetimeSearchContext, target_seeds: MtSeed[]): Promise<GpuDatetimeSearchIterator>;
    /**
     * 次のバッチを取得
     *
     * 検索完了時は `None` を返す。
     * 組み合わせ切り替えは内部で自動的に行われる。
     */
    next(): Promise<GpuSearchBatch | undefined>;
    /**
     * 検索が完了したか
     */
    readonly is_done: boolean;
    /**
     * 進捗率 (0.0 - 1.0)
     */
    readonly progress: number;
}

/**
 * MT Seed 起動時刻検索器
 */
export class MtseedDatetimeSearcher {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * 新しい `MtseedDatetimeSearcher` を作成
     *
     * # Errors
     *
     * - `target_seeds` が空の場合
     * - `time_range` のバリデーション失敗
     */
    constructor(params: MtseedDatetimeSearchParams);
    /**
     * 次のバッチを検索
     */
    next_batch(chunk_count: number): MtseedDatetimeSearchBatch;
    readonly is_done: boolean;
    readonly progress: number;
}

/**
 * MT Seed 検索器
 */
export class MtseedSearcher {
    free(): void;
    [Symbol.dispose](): void;
    constructor(params: MtseedSearchParams);
    /**
     * 次のバッチを検索
     */
    next_batch(chunk_size: number): MtseedSearchBatch;
    readonly is_done: boolean;
    readonly progress: number;
}

/**
 * `TrainerInfo` 起動時刻検索器
 */
export class TrainerInfoSearcher {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * 新しい `TrainerInfoSearcher` を作成
     *
     * # Errors
     * - `StartMode::Continue` が指定された場合
     * - `GameStartConfig` の検証失敗
     */
    constructor(params: TrainerInfoSearchParams);
    /**
     * 次のバッチを取得
     */
    next_batch(chunk_count: number): TrainerInfoSearchBatch;
    readonly is_done: boolean;
    readonly progress: number;
}

/**
 * タマゴ一括生成 (公開 API)
 *
 * - 解決済み Seed 対応: `Vec<SeedOrigin>` を受け取る
 * - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
 *
 * # Arguments
 *
 * * `origins` - 解決済み Seed リスト
 * * `params` - 生成パラメータ
 * * `config` - 共通設定 (バージョン、オフセット、検索範囲)
 * * `filter` - 孵化フィルタ (None の場合は全件返却)
 *
 * # Errors
 *
 * - 起動設定が無効な場合
 */
export function generate_egg_list(origins: SeedOrigin[], params: EggGenerationParams, config: GenerationConfig, filter?: EggFilter | null): GeneratedEggData[];

/**
 * タスク生成関数
 *
 * `DatetimeSearchContext` と `DateRangeParams` から、
 * 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
 * Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (Timer0/VCount/KeyCode 範囲)
 * - `date_range`: 日付範囲 (開始日〜終了日)
 * - `egg_params`: 孵化生成パラメータ
 * - `gen_config`: 生成共通設定
 * - `filter`: フィルター (None の場合は全件返却)
 * - `worker_count`: Worker 数
 */
export function generate_egg_search_tasks(context: DatetimeSearchContext, egg_params: EggGenerationParams, gen_config: GenerationConfig, filter: EggFilter | null | undefined, worker_count: number): EggDatetimeSearchParams[];

/**
 * MT Seed IV 検索タスクを生成
 *
 * 全 Seed 空間 (0〜2^32-1) を `worker_count` 個のタスクに均等分割する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (`iv_filter`, `mt_offset`, `is_roamer`)
 * - `worker_count`: Worker 数
 *
 * # Returns
 * 分割されたタスクのリスト（各タスクは閉区間 `[start_seed, end_seed]`）
 */
export function generate_mtseed_iv_search_tasks(context: MtseedSearchContext, worker_count: number): MtseedSearchParams[];

/**
 * タスク生成関数
 *
 * `DatetimeSearchContext` から、
 * 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
 * Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (日付範囲、時刻範囲、Timer0/VCount/KeyCode 範囲)
 * - `target_seeds`: 検索対象の MT Seed
 * - `worker_count`: Worker 数
 */
export function generate_mtseed_search_tasks(context: DatetimeSearchContext, target_seeds: MtSeed[], worker_count: number): MtseedDatetimeSearchParams[];

/**
 * ポケモン一括生成 (公開 API)
 *
 * - 解決済み Seed 対応: `Vec<SeedOrigin>` を受け取る
 * - フィルタ対応: `filter` が Some の場合、条件に合致する個体のみ返却
 *
 * # Arguments
 *
 * * `origins` - 解決済み Seed リスト
 * * `params` - 生成パラメータ (Wild / Static 統合)
 * * `config` - 共通設定 (バージョン、オフセット、検索範囲)
 * * `filter` - ポケモンフィルタ (None の場合は全件返却)
 *
 * # Errors
 *
 * - 起動設定が無効な場合
 * - エンカウントスロットが空の場合
 */
export function generate_pokemon_list(origins: SeedOrigin[], params: PokemonGenerationParams, config: GenerationConfig, filter?: PokemonFilter | null): GeneratedPokemonData[];

/**
 * 検索タスクを生成
 *
 * `DatetimeSearchContext` から、
 * 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
 * Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (日付範囲、時刻範囲、Timer0/VCount/KeyCode 範囲)
 * - `filter`: 検索フィルタ
 * - `game_start`: 起動設定
 * - `worker_count`: Worker 数
 */
export function generate_trainer_info_search_tasks(context: DatetimeSearchContext, filter: TrainerInfoFilter, game_start: GameStartConfig, worker_count: number): TrainerInfoSearchParams[];

/**
 * `KeySpec` から有効なキー組み合わせ総数を取得
 *
 * 無効パターン (上下/左右同時押し、ソフトリセット) を除外した数を返す。
 */
export function get_key_combination_count(key_spec: KeySpec): number;

/**
 * 針パターンを取得 (ユーティリティ関数)
 *
 * 指定した Seed と advance から始まる針パターンを取得。
 */
export function get_needle_pattern_at(seed_value: bigint, advance: number, count: number): Uint8Array;

/**
 * Health check function to verify WASM module is loaded correctly
 */
export function health_check(): string;

export function init(): void;

/**
 * 卵データをバッチ解決
 *
 * # Arguments
 * * `data` - 生成された卵データの配列
 * * `locale` - ロケール (`"ja"` または `"en"`)
 * * `species_id` - 種族ID (任意。指定時は種族名や特性名を解決)
 *
 * # Returns
 * 解決済み表示用卵データの配列
 */
export function resolve_egg_data_batch(data: GeneratedEggData[], locale: string, species_id?: number | null): UiEggData[];

/**
 * ポケモンデータをバッチ解決
 *
 * # Arguments
 * * `data` - 生成されたポケモンデータの配列
 * * `version` - ROMバージョン
 * * `locale` - ロケール (`"ja"` または `"en"`)
 *
 * # Returns
 * 解決済み表示用ポケモンデータの配列
 */
export function resolve_pokemon_data_batch(data: GeneratedPokemonData[], version: RomVersion, locale: string): UiPokemonData[];

/**
 * Seed 解決 (公開 API)
 *
 * `SeedSpec` から `SeedOrigin` のリストを生成。
 * UI/Worker 側で事前に呼び出す。
 *
 * # Errors
 * - `Seeds` が空の場合
 * - `Startup` で `ranges` が空の場合
 */
export function resolve_seeds(input: SeedSpec): SeedOrigin[];

/**
 * レポート針パターン検索 (公開 API)
 *
 * 各 `SeedOrigin` について、`NeedlePattern` が出現する位置を検索。
 * 返却する `advance` はパターン末尾位置 (ユーザーが最後に観測した針の位置)。
 *
 * # Arguments
 * * `origins` - 既に解決された Seed リスト
 * * `pattern` - 検索する針パターン
 * * `config` - 生成設定 (`version`, `game_start`, `user_offset`, `max_advance`)
 *
 * # Returns
 * パターンが一致した全件の結果リスト
 *
 * # Errors
 * - 起動設定が無効な場合
 */
export function search_needle_pattern(origins: SeedOrigin[], pattern: NeedlePattern, config: GenerationConfig): NeedleSearchResult[];

/**
 * 日時範囲分割 (共通関数)
 *
 * 検索範囲を `n` 分割して、各 Worker に渡すための `SearchRangeParams` リストを生成する。
 * 境界値での連続性を保証するため、各チャンクの終了秒 + 1 = 次チャンクの開始秒 となる。
 *
 * # Arguments
 * - `range`: 分割対象の検索範囲
 * - `n`: 分割数 (0 の場合は 1 として扱う)
 *
 * # Returns
 * 分割された `SearchRangeParams` のリスト (最大 `n` 要素)
 */
export function split_search_range(range: SearchRangeParams, n: number): SearchRangeParams[];

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_eggdatetimesearcher_free: (a: number, b: number) => void;
    readonly __wbg_gpudatetimesearchiterator_free: (a: number, b: number) => void;
    readonly __wbg_mtseeddatetimesearcher_free: (a: number, b: number) => void;
    readonly __wbg_mtseedsearcher_free: (a: number, b: number) => void;
    readonly __wbg_trainerinfosearcher_free: (a: number, b: number) => void;
    readonly eggdatetimesearcher_is_done: (a: number) => number;
    readonly eggdatetimesearcher_new: (a: any) => [number, number, number];
    readonly eggdatetimesearcher_next_batch: (a: number, b: number) => any;
    readonly eggdatetimesearcher_progress: (a: number) => number;
    readonly generate_egg_list: (a: number, b: number, c: any, d: any, e: number) => [number, number, number, number];
    readonly generate_egg_search_tasks: (a: any, b: any, c: any, d: number, e: number) => [number, number];
    readonly generate_mtseed_iv_search_tasks: (a: any, b: number) => [number, number];
    readonly generate_mtseed_search_tasks: (a: any, b: number, c: number, d: number) => [number, number];
    readonly generate_pokemon_list: (a: number, b: number, c: any, d: any, e: number) => [number, number, number, number];
    readonly generate_trainer_info_search_tasks: (a: any, b: any, c: any, d: number) => [number, number];
    readonly get_key_combination_count: (a: any) => number;
    readonly get_needle_pattern_at: (a: bigint, b: number, c: number) => [number, number];
    readonly gpudatetimesearchiterator_create: (a: any, b: number, c: number) => any;
    readonly gpudatetimesearchiterator_is_done: (a: number) => number;
    readonly gpudatetimesearchiterator_next: (a: number) => any;
    readonly gpudatetimesearchiterator_progress: (a: number) => number;
    readonly health_check: () => [number, number];
    readonly mtseeddatetimesearcher_is_done: (a: number) => number;
    readonly mtseeddatetimesearcher_new: (a: any) => [number, number, number];
    readonly mtseeddatetimesearcher_next_batch: (a: number, b: number) => any;
    readonly mtseeddatetimesearcher_progress: (a: number) => number;
    readonly mtseedsearcher_is_done: (a: number) => number;
    readonly mtseedsearcher_new: (a: any) => number;
    readonly mtseedsearcher_next_batch: (a: number, b: number) => any;
    readonly mtseedsearcher_progress: (a: number) => number;
    readonly resolve_egg_data_batch: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly resolve_pokemon_data_batch: (a: number, b: number, c: any, d: number, e: number) => [number, number];
    readonly resolve_seeds: (a: any) => [number, number, number, number];
    readonly search_needle_pattern: (a: number, b: number, c: any, d: any) => [number, number, number, number];
    readonly split_search_range: (a: any, b: number) => [number, number];
    readonly trainerinfosearcher_is_done: (a: number) => number;
    readonly trainerinfosearcher_new: (a: any) => [number, number, number];
    readonly trainerinfosearcher_next_batch: (a: number, b: number) => any;
    readonly trainerinfosearcher_progress: (a: number) => number;
    readonly init: () => void;
    readonly wasm_bindgen_c7c36fbcbf27e5fc___closure__destroy___dyn_core_679abc6d1f37082f___ops__function__FnMut__wasm_bindgen_c7c36fbcbf27e5fc___JsValue____Output_______: (a: number, b: number) => void;
    readonly wasm_bindgen_c7c36fbcbf27e5fc___convert__closures_____invoke___wasm_bindgen_c7c36fbcbf27e5fc___JsValue__wasm_bindgen_c7c36fbcbf27e5fc___JsValue_____: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_c7c36fbcbf27e5fc___convert__closures_____invoke___wasm_bindgen_c7c36fbcbf27e5fc___JsValue_____: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
