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
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_done_57b39ecd9addfe81: function(arg0) {
            const ret = arg0.done;
            return ret;
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
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_35a7bace40f36eac: function(arg0) {
            const ret = arg0.length;
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
        __wbg_new_dca287b076112a51: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_dd2b680c8bf6ae29: function(arg0) {
            const ret = new Uint8Array(arg0);
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
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_set_1eb0999cf5d27fc8: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_f43e577aea94465b: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_0546255b415e96c1: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0) {
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

const EggDatetimeSearcherFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_eggdatetimesearcher_free(ptr >>> 0, 1));
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
