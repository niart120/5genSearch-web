/* @ts-self-types="./wasm_pkg.d.ts" */

/**
 * 孵化起動時刻検索器
 */
export class EggDatetimeSearcher {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EggDatetimeSearcherFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_eggdatetimesearcher_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get is_done() {
        const ret = wasm.eggdatetimesearcher_is_done(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * 新しい `EggDatetimeSearcher` を作成
     *
     * # Errors
     *
     * - `time_range` のバリデーション失敗
     * @param {EggDatetimeSearchParams} params
     */
    constructor(params) {
        const ret = wasm.eggdatetimesearcher_new(params);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        EggDatetimeSearcherFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 次のバッチを検索
     * @param {number} chunk_count
     * @returns {EggDatetimeSearchBatch}
     */
    next_batch(chunk_count) {
        const ret = wasm.eggdatetimesearcher_next_batch(this.__wbg_ptr, chunk_count);
        return ret;
    }
    /**
     * @returns {number}
     */
    get progress() {
        const ret = wasm.eggdatetimesearcher_progress(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) EggDatetimeSearcher.prototype[Symbol.dispose] = EggDatetimeSearcher.prototype.free;

/**
 * GPU 起動時刻検索イテレータ
 *
 * `AsyncIterator` パターンで GPU 検索を実行する。
 * `next()` を呼び出すたびに最適バッチサイズで GPU ディスパッチを実行し、
 * 結果・進捗・スループットを返す。
 */
export class GpuDatetimeSearchIterator {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GpuDatetimeSearchIterator.prototype);
        obj.__wbg_ptr = ptr;
        GpuDatetimeSearchIteratorFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GpuDatetimeSearchIteratorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gpudatetimesearchiterator_free(ptr, 0);
    }
    /**
     * 検索が完了したか
     * @returns {boolean}
     */
    get is_done() {
        const ret = wasm.gpudatetimesearchiterator_is_done(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * イテレータを作成
     *
     * # Errors
     *
     * - GPU デバイスが利用不可の場合
     * - `target_seeds` が空の場合
     * @param {MtseedDatetimeSearchParams} params
     */
    constructor(params) {
        const ret = wasm.gpudatetimesearchiterator_new(params);
        return ret;
    }
    /**
     * 次のバッチを取得
     *
     * 検索完了時は `None` を返す。
     * @returns {Promise<GpuSearchBatch | undefined>}
     */
    next() {
        const ret = wasm.gpudatetimesearchiterator_next(this.__wbg_ptr);
        return ret;
    }
    /**
     * 進捗率 (0.0 - 1.0)
     * @returns {number}
     */
    get progress() {
        const ret = wasm.gpudatetimesearchiterator_progress(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) GpuDatetimeSearchIterator.prototype[Symbol.dispose] = GpuDatetimeSearchIterator.prototype.free;

/**
 * MT Seed 起動時刻検索器
 */
export class MtseedDatetimeSearcher {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MtseedDatetimeSearcherFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mtseeddatetimesearcher_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get is_done() {
        const ret = wasm.mtseeddatetimesearcher_is_done(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * 新しい `MtseedDatetimeSearcher` を作成
     *
     * # Errors
     *
     * - `target_seeds` が空の場合
     * - `time_range` のバリデーション失敗
     * @param {MtseedDatetimeSearchParams} params
     */
    constructor(params) {
        const ret = wasm.mtseeddatetimesearcher_new(params);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        MtseedDatetimeSearcherFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 次のバッチを検索
     * @param {number} chunk_count
     * @returns {MtseedDatetimeSearchBatch}
     */
    next_batch(chunk_count) {
        const ret = wasm.mtseeddatetimesearcher_next_batch(this.__wbg_ptr, chunk_count);
        return ret;
    }
    /**
     * @returns {number}
     */
    get progress() {
        const ret = wasm.mtseeddatetimesearcher_progress(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) MtseedDatetimeSearcher.prototype[Symbol.dispose] = MtseedDatetimeSearcher.prototype.free;

/**
 * MT Seed 検索器
 */
export class MtseedSearcher {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MtseedSearcherFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mtseedsearcher_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get is_done() {
        const ret = wasm.mtseedsearcher_is_done(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {MtseedSearchParams} params
     */
    constructor(params) {
        const ret = wasm.mtseedsearcher_new(params);
        this.__wbg_ptr = ret >>> 0;
        MtseedSearcherFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 次のバッチを検索
     * @param {number} chunk_size
     * @returns {MtseedSearchBatch}
     */
    next_batch(chunk_size) {
        const ret = wasm.mtseedsearcher_next_batch(this.__wbg_ptr, chunk_size);
        return ret;
    }
    /**
     * @returns {number}
     */
    get progress() {
        const ret = wasm.mtseedsearcher_progress(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) MtseedSearcher.prototype[Symbol.dispose] = MtseedSearcher.prototype.free;

/**
 * `TrainerInfo` 起動時刻検索器
 */
export class TrainerInfoSearcher {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrainerInfoSearcherFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_trainerinfosearcher_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get is_done() {
        const ret = wasm.trainerinfosearcher_is_done(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * 新しい `TrainerInfoSearcher` を作成
     *
     * # Errors
     * - `StartMode::Continue` が指定された場合
     * - `GameStartConfig` の検証失敗
     * @param {TrainerInfoSearchParams} params
     */
    constructor(params) {
        const ret = wasm.trainerinfosearcher_new(params);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        TrainerInfoSearcherFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 次のバッチを取得
     * @param {number} chunk_count
     * @returns {TrainerInfoSearchBatch}
     */
    next_batch(chunk_count) {
        const ret = wasm.trainerinfosearcher_next_batch(this.__wbg_ptr, chunk_count);
        return ret;
    }
    /**
     * @returns {number}
     */
    get progress() {
        const ret = wasm.trainerinfosearcher_progress(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) TrainerInfoSearcher.prototype[Symbol.dispose] = TrainerInfoSearcher.prototype.free;

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
 * @param {SeedOrigin[]} origins
 * @param {EggGenerationParams} params
 * @param {GenerationConfig} config
 * @param {EggFilter | null} [filter]
 * @returns {GeneratedEggData[]}
 */
export function generate_egg_list(origins, params, config, filter) {
    const ptr0 = passArrayJsValueToWasm0(origins, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_egg_list(ptr0, len0, params, config, isLikeNone(filter) ? 0 : addToExternrefTable0(filter));
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

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
 * @param {DatetimeSearchContext} context
 * @param {DateRangeParams} date_range
 * @param {EggGenerationParams} egg_params
 * @param {GenerationConfig} gen_config
 * @param {EggFilter | null | undefined} filter
 * @param {number} worker_count
 * @returns {EggDatetimeSearchParams[]}
 */
export function generate_egg_search_tasks(context, date_range, egg_params, gen_config, filter, worker_count) {
    const ret = wasm.generate_egg_search_tasks(context, date_range, egg_params, gen_config, isLikeNone(filter) ? 0 : addToExternrefTable0(filter), worker_count);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * タスク生成関数
 *
 * `DatetimeSearchContext` と `DateRangeParams` から、
 * 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
 * Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (Timer0/VCount/KeyCode 範囲)
 * - `target_seeds`: 検索対象の MT Seed
 * - `date_range`: 日付範囲 (開始日〜終了日)
 * - `worker_count`: Worker 数
 * @param {DatetimeSearchContext} context
 * @param {MtSeed[]} target_seeds
 * @param {DateRangeParams} date_range
 * @param {number} worker_count
 * @returns {MtseedDatetimeSearchParams[]}
 */
export function generate_mtseed_search_tasks(context, target_seeds, date_range, worker_count) {
    const ptr0 = passArrayJsValueToWasm0(target_seeds, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_mtseed_search_tasks(context, ptr0, len0, date_range, worker_count);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

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
 * @param {SeedOrigin[]} origins
 * @param {PokemonGenerationParams} params
 * @param {GenerationConfig} config
 * @param {PokemonFilter | null} [filter]
 * @returns {GeneratedPokemonData[]}
 */
export function generate_pokemon_list(origins, params, config, filter) {
    const ptr0 = passArrayJsValueToWasm0(origins, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_pokemon_list(ptr0, len0, params, config, isLikeNone(filter) ? 0 : addToExternrefTable0(filter));
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * 検索タスクを生成
 *
 * `DatetimeSearchContext` と `DateRangeParams` から、
 * 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
 * Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
 *
 * # Arguments
 * - `context`: 検索コンテキスト (Timer0/VCount/KeyCode 範囲)
 * - `filter`: 検索フィルタ
 * - `game_start`: 起動設定
 * - `date_range`: 日付範囲 (開始日〜終了日)
 * - `worker_count`: Worker 数
 * @param {DatetimeSearchContext} context
 * @param {TrainerInfoFilter} filter
 * @param {GameStartConfig} game_start
 * @param {DateRangeParams} date_range
 * @param {number} worker_count
 * @returns {TrainerInfoSearchParams[]}
 */
export function generate_trainer_info_search_tasks(context, filter, game_start, date_range, worker_count) {
    const ret = wasm.generate_trainer_info_search_tasks(context, filter, game_start, date_range, worker_count);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * `KeySpec` から有効なキー組み合わせ総数を取得
 *
 * 無効パターン (上下/左右同時押し、ソフトリセット) を除外した数を返す。
 * @param {KeySpec} key_spec
 * @returns {number}
 */
export function get_key_combination_count(key_spec) {
    const ret = wasm.get_key_combination_count(key_spec);
    return ret >>> 0;
}

/**
 * 針パターンを取得 (ユーティリティ関数)
 *
 * 指定した Seed と advance から始まる針パターンを取得。
 * @param {bigint} seed_value
 * @param {number} advance
 * @param {number} count
 * @returns {Uint8Array}
 */
export function get_needle_pattern_at(seed_value, advance, count) {
    const ret = wasm.get_needle_pattern_at(seed_value, advance, count);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Health check function to verify WASM module is loaded correctly
 * @returns {string}
 */
export function health_check() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.health_check();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

export function init() {
    wasm.init();
}

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
 * @param {GeneratedEggData[]} data
 * @param {string} locale
 * @param {number | null} [species_id]
 * @returns {UiEggData[]}
 */
export function resolve_egg_data_batch(data, locale, species_id) {
    const ptr0 = passArrayJsValueToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.resolve_egg_data_batch(ptr0, len0, ptr1, len1, isLikeNone(species_id) ? 0xFFFFFF : species_id);
    var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

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
 * @param {GeneratedPokemonData[]} data
 * @param {RomVersion} version
 * @param {string} locale
 * @returns {UiPokemonData[]}
 */
export function resolve_pokemon_data_batch(data, version, locale) {
    const ptr0 = passArrayJsValueToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.resolve_pokemon_data_batch(ptr0, len0, version, ptr1, len1);
    var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Seed 解決 (公開 API)
 *
 * `SeedSpec` から `SeedOrigin` のリストを生成。
 * UI/Worker 側で事前に呼び出す。
 *
 * # Errors
 * - `Seeds` が空の場合
 * - `Startup` で `ranges` が空の場合
 * @param {SeedSpec} input
 * @returns {SeedOrigin[]}
 */
export function resolve_seeds(input) {
    const ret = wasm.resolve_seeds(input);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

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
 * @param {SeedOrigin[]} origins
 * @param {NeedlePattern} pattern
 * @param {GenerationConfig} config
 * @returns {NeedleSearchResult[]}
 */
export function search_needle_pattern(origins, pattern, config) {
    const ptr0 = passArrayJsValueToWasm0(origins, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.search_needle_pattern(ptr0, len0, pattern, config);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

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
 * @param {SearchRangeParams} range
 * @param {number} n
 * @returns {SearchRangeParams[]}
 */
export function split_search_range(range, n) {
    const ret = wasm.split_search_range(range, n);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_8c4e43fe74559d73: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_Number_04624de7d0e8332d: function(arg0) {
            const ret = Number(arg0);
            return ret;
        },
        __wbg_String_8f0eb39a4a4c2f66: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_Window_2b9b35492d4b2d63: function(arg0) {
            const ret = arg0.Window;
            return ret;
        },
        __wbg_WorkerGlobalScope_b4fb13f0ba6527ab: function(arg0) {
            const ret = arg0.WorkerGlobalScope;
            return ret;
        },
        __wbg___wbindgen_bigint_get_as_i64_8fcf4ce7f1ca72a2: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0bc8482c6e3508ae: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_47fa6863be6f2f25: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_31b12575b56f32fc: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_ac34f5003991759a: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_cd444516edc5b180: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_9e4d92534c42d778: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_11888390b0186270: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_8ff4255516ccad3e: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_d9b87ff7982e3b21: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_beginComputePass_2061bb5db1032a35: function(arg0, arg1) {
            const ret = arg0.beginComputePass(arg1);
            return ret;
        },
        __wbg_buffer_26d0910f3a5bc899: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_4708e0c13bdc8e95: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_copyBufferToBuffer_e5b6f95a75ade65d: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbg_createBindGroupLayout_b87a1f26ed22bd5d: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.createBindGroupLayout(arg1);
            return ret;
        }, arguments); },
        __wbg_createBindGroup_dfdadbbcf4dcae54: function(arg0, arg1) {
            const ret = arg0.createBindGroup(arg1);
            return ret;
        },
        __wbg_createBuffer_fb1752eab5cb2a7f: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.createBuffer(arg1);
            return ret;
        }, arguments); },
        __wbg_createCommandEncoder_92b1c283a0372974: function(arg0, arg1) {
            const ret = arg0.createCommandEncoder(arg1);
            return ret;
        },
        __wbg_createComputePipeline_4cdc84e4d346bd71: function(arg0, arg1) {
            const ret = arg0.createComputePipeline(arg1);
            return ret;
        },
        __wbg_createPipelineLayout_c97169a1a177450e: function(arg0, arg1) {
            const ret = arg0.createPipelineLayout(arg1);
            return ret;
        },
        __wbg_createShaderModule_159013272c1b4c4c: function(arg0, arg1) {
            const ret = arg0.createShaderModule(arg1);
            return ret;
        },
        __wbg_dispatchWorkgroups_89c6778d0518442a: function(arg0, arg1, arg2, arg3) {
            arg0.dispatchWorkgroups(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
        },
        __wbg_done_57b39ecd9addfe81: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_end_56b2d6d0610f9131: function(arg0) {
            arg0.end();
        },
        __wbg_entries_58c7934c745daac7: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_finish_ac8e8f8408208d93: function(arg0) {
            const ret = arg0.finish();
            return ret;
        },
        __wbg_finish_b79779da004ef346: function(arg0, arg1) {
            const ret = arg0.finish(arg1);
            return ret;
        },
        __wbg_getMappedRange_86d4a434bceeb7fc: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getMappedRange(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_get_9b94d73e6221f75c: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_b3ed3ad4be2bc8ac: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_with_ref_key_1dc361bd10053bfe: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_gpu_051bdce6489ddf6a: function(arg0) {
            const ret = arg0.gpu;
            return ret;
        },
        __wbg_gpudatetimesearchiterator_new: function(arg0) {
            const ret = GpuDatetimeSearchIterator.__wrap(arg0);
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_GpuAdapter_aff4b0f95a6c1c3e: function(arg0) {
            let result;
            try {
                result = arg0 instanceof GPUAdapter;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_53af74335dec57f4: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_9b9075935c74707c: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_d314bb98fcf08331: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_bfbc7332a9768d2a: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_iterator_6ff6560ca1568e55: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_label_c3a930571192f18e: function(arg0, arg1) {
            const ret = arg1.label;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_35a7bace40f36eac: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_limits_12dd06e895d48466: function(arg0) {
            const ret = arg0.limits;
            return ret;
        },
        __wbg_mapAsync_0d9cf9d11808b275: function(arg0, arg1, arg2, arg3) {
            const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
            return ret;
        },
        __wbg_maxBindGroups_060f2b40f8a292b1: function(arg0) {
            const ret = arg0.maxBindGroups;
            return ret;
        },
        __wbg_maxBindingsPerBindGroup_3e4b03bbed2da128: function(arg0) {
            const ret = arg0.maxBindingsPerBindGroup;
            return ret;
        },
        __wbg_maxBufferSize_deda0fa7852420cb: function(arg0) {
            const ret = arg0.maxBufferSize;
            return ret;
        },
        __wbg_maxColorAttachmentBytesPerSample_4a4a0e04d76eaf2a: function(arg0) {
            const ret = arg0.maxColorAttachmentBytesPerSample;
            return ret;
        },
        __wbg_maxColorAttachments_db4883eeb9e8aeae: function(arg0) {
            const ret = arg0.maxColorAttachments;
            return ret;
        },
        __wbg_maxComputeInvocationsPerWorkgroup_d050c461ebc92998: function(arg0) {
            const ret = arg0.maxComputeInvocationsPerWorkgroup;
            return ret;
        },
        __wbg_maxComputeWorkgroupSizeX_48153a1b779879ad: function(arg0) {
            const ret = arg0.maxComputeWorkgroupSizeX;
            return ret;
        },
        __wbg_maxComputeWorkgroupSizeY_7f73d3d16fdea180: function(arg0) {
            const ret = arg0.maxComputeWorkgroupSizeY;
            return ret;
        },
        __wbg_maxComputeWorkgroupSizeZ_9fcad0f0dfcffb05: function(arg0) {
            const ret = arg0.maxComputeWorkgroupSizeZ;
            return ret;
        },
        __wbg_maxComputeWorkgroupStorageSize_9fe29e00c7d166a6: function(arg0) {
            const ret = arg0.maxComputeWorkgroupStorageSize;
            return ret;
        },
        __wbg_maxComputeWorkgroupsPerDimension_f8321761bc8e8feb: function(arg0) {
            const ret = arg0.maxComputeWorkgroupsPerDimension;
            return ret;
        },
        __wbg_maxDynamicStorageBuffersPerPipelineLayout_55e1416c376721db: function(arg0) {
            const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
            return ret;
        },
        __wbg_maxDynamicUniformBuffersPerPipelineLayout_17ff0903196c41a7: function(arg0) {
            const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
            return ret;
        },
        __wbg_maxSampledTexturesPerShaderStage_59e5fc159e536f0d: function(arg0) {
            const ret = arg0.maxSampledTexturesPerShaderStage;
            return ret;
        },
        __wbg_maxSamplersPerShaderStage_84f119909016576b: function(arg0) {
            const ret = arg0.maxSamplersPerShaderStage;
            return ret;
        },
        __wbg_maxStorageBufferBindingSize_f9c3b3d285375ee0: function(arg0) {
            const ret = arg0.maxStorageBufferBindingSize;
            return ret;
        },
        __wbg_maxStorageBuffersPerShaderStage_f84b702138ac86a4: function(arg0) {
            const ret = arg0.maxStorageBuffersPerShaderStage;
            return ret;
        },
        __wbg_maxStorageTexturesPerShaderStage_226be46cbf594437: function(arg0) {
            const ret = arg0.maxStorageTexturesPerShaderStage;
            return ret;
        },
        __wbg_maxTextureArrayLayers_a8bf77269db7b94e: function(arg0) {
            const ret = arg0.maxTextureArrayLayers;
            return ret;
        },
        __wbg_maxTextureDimension1D_8e69ba5596959195: function(arg0) {
            const ret = arg0.maxTextureDimension1D;
            return ret;
        },
        __wbg_maxTextureDimension2D_5a7a17047785cba5: function(arg0) {
            const ret = arg0.maxTextureDimension2D;
            return ret;
        },
        __wbg_maxTextureDimension3D_1ea793f1095d392a: function(arg0) {
            const ret = arg0.maxTextureDimension3D;
            return ret;
        },
        __wbg_maxUniformBufferBindingSize_4b41f90d6914a995: function(arg0) {
            const ret = arg0.maxUniformBufferBindingSize;
            return ret;
        },
        __wbg_maxUniformBuffersPerShaderStage_c5db04bf022a0c83: function(arg0) {
            const ret = arg0.maxUniformBuffersPerShaderStage;
            return ret;
        },
        __wbg_maxVertexAttributes_e94e6c887b993b6c: function(arg0) {
            const ret = arg0.maxVertexAttributes;
            return ret;
        },
        __wbg_maxVertexBufferArrayStride_92c15a2c2f0faf82: function(arg0) {
            const ret = arg0.maxVertexBufferArrayStride;
            return ret;
        },
        __wbg_maxVertexBuffers_db05674c76ef98c9: function(arg0) {
            const ret = arg0.maxVertexBuffers;
            return ret;
        },
        __wbg_minStorageBufferOffsetAlignment_2c9fb697a4aedb8b: function(arg0) {
            const ret = arg0.minStorageBufferOffsetAlignment;
            return ret;
        },
        __wbg_minUniformBufferOffsetAlignment_6357875312bfd2f0: function(arg0) {
            const ret = arg0.minUniformBufferOffsetAlignment;
            return ret;
        },
        __wbg_navigator_43be698ba96fc088: function(arg0) {
            const ret = arg0.navigator;
            return ret;
        },
        __wbg_navigator_4478931f32ebca57: function(arg0) {
            const ret = arg0.navigator;
            return ret;
        },
        __wbg_new_361308b2356cecd0: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_3eb36ae241fe6f44: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_b5d9e2fb389fef91: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue__wasm_bindgen_fe984bb8de369ec8___JsValue_____(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = state0.b = 0;
            }
        },
        __wbg_new_dca287b076112a51: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_dd2b680c8bf6ae29: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_from_slice_a3d2629dc1826784: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_no_args_1c7c842f08d00ebb: function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_byte_offset_and_length_aa261d9c9da49eb1: function(arg0, arg1, arg2) {
            const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_next_3482f54c49e8af19: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_next_418f80d8f5303233: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_now_a3af9a2f4bbaa4d1: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_8ffdcb2063340ba5: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_queueMicrotask_0aa0a927f78f5d98: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_5bb536982f78a56f: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_queue_1f589e8194b004a6: function(arg0) {
            const ret = arg0.queue;
            return ret;
        },
        __wbg_requestAdapter_51be7e8ee7d08b87: function(arg0, arg1) {
            const ret = arg0.requestAdapter(arg1);
            return ret;
        },
        __wbg_requestDevice_338f0085866d40a2: function(arg0, arg1) {
            const ret = arg0.requestDevice(arg1);
            return ret;
        },
        __wbg_resolve_002c4b7d9d8f6b64: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_setBindGroup_43392eaf8ea524fa: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
        }, arguments); },
        __wbg_setBindGroup_b90f6f79c7be4f96: function(arg0, arg1, arg2) {
            arg0.setBindGroup(arg1 >>> 0, arg2);
        },
        __wbg_setPipeline_e7c896fa93c7f292: function(arg0, arg1) {
            arg0.setPipeline(arg1);
        },
        __wbg_set_1eb0999cf5d27fc8: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_25cf9deff6bf0ea8: function(arg0, arg1, arg2) {
            arg0.set(arg1, arg2 >>> 0);
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_6cb8631f80447a67: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_access_c17e0a436ed1d78e: function(arg0, arg1) {
            arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
        },
        __wbg_set_beginning_of_pass_write_index_90fab5f12cddf335: function(arg0, arg1) {
            arg0.beginningOfPassWriteIndex = arg1 >>> 0;
        },
        __wbg_set_bind_group_layouts_9eff5e187a1db39e: function(arg0, arg1) {
            arg0.bindGroupLayouts = arg1;
        },
        __wbg_set_binding_3ada8a83c514d419: function(arg0, arg1) {
            arg0.binding = arg1 >>> 0;
        },
        __wbg_set_binding_9a389db987313ca9: function(arg0, arg1) {
            arg0.binding = arg1 >>> 0;
        },
        __wbg_set_buffer_581ee8422928bd0d: function(arg0, arg1) {
            arg0.buffer = arg1;
        },
        __wbg_set_buffer_ac25c198252221bd: function(arg0, arg1) {
            arg0.buffer = arg1;
        },
        __wbg_set_code_1d146372551ab97f: function(arg0, arg1, arg2) {
            arg0.code = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_compute_edb2d4dd43759577: function(arg0, arg1) {
            arg0.compute = arg1;
        },
        __wbg_set_end_of_pass_write_index_bd98b6c885176c21: function(arg0, arg1) {
            arg0.endOfPassWriteIndex = arg1 >>> 0;
        },
        __wbg_set_entries_136baaaafb25087f: function(arg0, arg1) {
            arg0.entries = arg1;
        },
        __wbg_set_entries_7c41d594195ebe78: function(arg0, arg1) {
            arg0.entries = arg1;
        },
        __wbg_set_entry_point_6f3d3792022065f4: function(arg0, arg1, arg2) {
            arg0.entryPoint = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_f43e577aea94465b: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_format_6ac892268eeef402: function(arg0, arg1) {
            arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
        },
        __wbg_set_has_dynamic_offset_9dc29179158975e4: function(arg0, arg1) {
            arg0.hasDynamicOffset = arg1 !== 0;
        },
        __wbg_set_label_21544401e31cd317: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_2312a64e22934a2b: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_2ed86217d97ea3d5: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_4e4cb7e7f8cc2b59: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_81dd67dee9cd4287: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_8f9ebe053f8da7a0: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_a96e4bdaec7882ee: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_bfbd23fc748f8f94: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_d400966bd7759b26: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_label_ecb2c1eab1d46433: function(arg0, arg1, arg2) {
            arg0.label = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_layout_0770a97fe3411616: function(arg0, arg1) {
            arg0.layout = arg1;
        },
        __wbg_set_layout_640caab7a290275b: function(arg0, arg1) {
            arg0.layout = arg1;
        },
        __wbg_set_mapped_at_creation_e0c884a30f64323b: function(arg0, arg1) {
            arg0.mappedAtCreation = arg1 !== 0;
        },
        __wbg_set_min_binding_size_4a9f4d0d9ee579af: function(arg0, arg1) {
            arg0.minBindingSize = arg1;
        },
        __wbg_set_module_3b5d2caf4d494fba: function(arg0, arg1) {
            arg0.module = arg1;
        },
        __wbg_set_multisampled_f2de771b3ad62ff3: function(arg0, arg1) {
            arg0.multisampled = arg1 !== 0;
        },
        __wbg_set_offset_a675629849c5f3b4: function(arg0, arg1) {
            arg0.offset = arg1;
        },
        __wbg_set_power_preference_f4cead100f48bab0: function(arg0, arg1) {
            arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
        },
        __wbg_set_query_set_9921033bb33d882c: function(arg0, arg1) {
            arg0.querySet = arg1;
        },
        __wbg_set_required_features_e9ee2e22feba0db3: function(arg0, arg1) {
            arg0.requiredFeatures = arg1;
        },
        __wbg_set_resource_5a4cc69a127b394e: function(arg0, arg1) {
            arg0.resource = arg1;
        },
        __wbg_set_sample_type_89fd8e71274ee6c2: function(arg0, arg1) {
            arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
        },
        __wbg_set_sampler_ab33334fb83c5a17: function(arg0, arg1) {
            arg0.sampler = arg1;
        },
        __wbg_set_size_a877ed6f434871bd: function(arg0, arg1) {
            arg0.size = arg1;
        },
        __wbg_set_size_b2cab7e432ec25dc: function(arg0, arg1) {
            arg0.size = arg1;
        },
        __wbg_set_storage_texture_0634dd6c87ac1132: function(arg0, arg1) {
            arg0.storageTexture = arg1;
        },
        __wbg_set_texture_9dc3759e93cfbb84: function(arg0, arg1) {
            arg0.texture = arg1;
        },
        __wbg_set_timestamp_writes_be461aab39b4e744: function(arg0, arg1) {
            arg0.timestampWrites = arg1;
        },
        __wbg_set_type_4ff365ea9ad896aa: function(arg0, arg1) {
            arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
        },
        __wbg_set_type_b4b2fc6fbad39aeb: function(arg0, arg1) {
            arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
        },
        __wbg_set_usage_a102e6844c6a65de: function(arg0, arg1) {
            arg0.usage = arg1 >>> 0;
        },
        __wbg_set_view_dimension_c6aedf84f79e2593: function(arg0, arg1) {
            arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
        },
        __wbg_set_view_dimension_ccb64a21a1495106: function(arg0, arg1) {
            arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
        },
        __wbg_set_visibility_3445d21752d17ded: function(arg0, arg1) {
            arg0.visibility = arg1 >>> 0;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_12837167ad935116: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_a621d3dfbb60d0ce: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_submit_522f9e0b9d7e22fd: function(arg0, arg1) {
            arg0.submit(arg1);
        },
        __wbg_then_0d9fe2c7b1857d32: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_b9e7b3b5f1a9e1b5: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_unmap_a7fc4fb3238304a4: function(arg0) {
            arg0.unmap();
        },
        __wbg_value_0546255b415e96c1: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_writeBuffer_b3540dd159ff60f1: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.writeBuffer(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 143, function: Function { arguments: [Externref], shim_idx: 144, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen_fe984bb8de369ec8___closure__destroy___dyn_core_679abc6d1f37082f___ops__function__FnMut__wasm_bindgen_fe984bb8de369ec8___JsValue____Output_______, wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue_____);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000006: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./wasm_pkg_bg.js": import0,
    };
}

function wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue_____(arg0, arg1, arg2) {
    wasm.wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue_____(arg0, arg1, arg2);
}

function wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue__wasm_bindgen_fe984bb8de369ec8___JsValue_____(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_fe984bb8de369ec8___convert__closures_____invoke___wasm_bindgen_fe984bb8de369ec8___JsValue__wasm_bindgen_fe984bb8de369ec8___JsValue_____(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];


const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];


const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];


const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];


const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];


const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];


const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];
const EggDatetimeSearcherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_eggdatetimesearcher_free(ptr >>> 0, 1));
const GpuDatetimeSearchIteratorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gpudatetimesearchiterator_free(ptr >>> 0, 1));
const MtseedDatetimeSearcherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mtseeddatetimesearcher_free(ptr >>> 0, 1));
const MtseedSearcherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mtseedsearcher_free(ptr >>> 0, 1));
const TrainerInfoSearcherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_trainerinfosearcher_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('wasm_pkg_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
