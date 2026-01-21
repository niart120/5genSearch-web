# Worker - WASM インタフェース設計: 個体生成

個体生成 (Pokemon/Egg) における Worker ↔ WASM 間のインタフェース設計。

## 1. 概要

### 1.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────────────────────┐
│ UI (Main Thread)                                                        │
│  - 生成パラメータ入力                                                    │
│  - 進捗表示・結果表示                                                    │
│  - Worker 管理                                                          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ postMessage (WorkerRequest/Response)
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Worker Layer                                                            │
│  - WASM 初期化・保持                                                     │
│  - 生成リクエスト受信・個体列挙                                           │
│  - 進捗通知・結果送信                                                    │
│  - 停止制御                                                              │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ WASM API 呼び出し
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ WASM Layer                                                              │
│  - LCG/MT19937 状態管理                                                  │
│  - 個体生成 (PID/性格/IV 等)                                             │
│  - イテレータ API                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 設計原則

1. **責務分離**: 生成ロジックは WASM、状態管理と通信は Worker
2. **イテレータパターン**: 1体ずつ生成し、停止・進捗制御を可能に
3. **バッチ出力**: 結果は一定数ごとにまとめて Main Thread へ送信

### 1.3 flows との関係

`flows/` 配下のドキュメントは「1つの LCG Seed から 1体の個体を生成する」アルゴリズムを記述。

本ドキュメントは「起点 Seed から複数の個体を列挙する」ための Worker/WASM インタフェースを記述。

```
flows/ (アルゴリズム)
  └─ generate_wild_pokemon(seed, config) → ResolvedPokemonData

worker-interface.md (本ドキュメント)
  └─ PokemonGenerator.next() → 内部で flows 相当の処理を実行
```

## 2. WASM API

### 2.1 PokemonGenerator

ある LCG Seed を起点に、指定消費数分の個体を列挙するイテレータ。

> **命名について**: 「SeedEnumerator」は Seed を列挙する印象を与えるため不採用。
> 本質は「Seed を進めながら Pokemon を生成する」ことなので `PokemonGenerator` とする。

> **MT Seed の導出ポイントに注意**
>
> 野生・固定ポケモンの IV も Mersenne Twister (MT19937) から生成される。
> **MT Seed は BaseSeed (オフセット適用前) から導出される**:
>
> ```rust
> // LcgSeed::derive_mt_seed() を使用 (types.md 参照)
> let mt_seed = base_seed.derive_mt_seed();
> ```
>
> IV 解決時は `base_seed` から MT Seed を計算し、バージョン・エンカウント種別に応じた消費数を適用:
>
> | バージョン | エンカウント | MT 消費数 |
> |-----------|-------------|----------|
> | BW | 野生・固定 | 0 |
> | BW2 | 野生・固定 | 2 |
> | BW/BW2 | 徘徊 | 1 |
>
> この設計により:
> - `PokemonGenerator::new()` は `base_seed` を保持 (IV 計算用)
> - LCG は `game_offset + user_offset` 分進めて個体生成開始
> - IV 解決は `base_seed` から MT Seed を導出し、上記消費数を適用

```rust
/// ポケモン個体生成イテレータ
#[wasm_bindgen]
pub struct PokemonGenerator {
    /// 起点 BaseSeed (MT Seed 導出用に保持)
    base_seed: LcgSeed,
    /// 現在の LCG 状態
    lcg: Lcg64,
    /// 生成設定
    config: PokemonGenerationConfig,
    /// 現在の消費数
    current_advance: u64,
    /// 最大消費数
    max_advance: u64,
    /// 生成済み個体数
    generated_count: u64,
}

#[wasm_bindgen]
impl PokemonGenerator {
    /// 生成器を作成
    /// 
    /// # Arguments
    /// * `base_seed` - 起点となる LCG Seed (64-bit)。MT Seed 導出にも使用
    /// * `config` - 生成設定
    /// * `game_offset` - ゲーム起動条件による固定消費数
    /// * `user_offset` - ユーザー指定の追加消費数
    /// * `max_advances` - 生成する最大消費数
    #[wasm_bindgen(constructor)]
    pub fn new(
        base_seed: LcgSeed,
        config: PokemonGenerationConfig,
        game_offset: u64,
        user_offset: u64,
        max_advances: u64,
    ) -> PokemonGenerator {
        // LCG はオフセット分進める
        let mut lcg = Lcg64::new(base_seed);
        lcg.advance(game_offset + user_offset);
        
        PokemonGenerator {
            base_seed,  // IV 計算用に保持
            lcg,
            config,
            current_advance: 0,
            max_advance: max_advances,
            generated_count: 0,
        }
    }
    
    /// 完了判定
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_advance >= self.max_advance
    }
    
    /// 現在の消費数
    #[wasm_bindgen(getter)]
    pub fn current_advance(&self) -> u64 {
        self.current_advance
    }
    
    /// 生成済み個体数
    #[wasm_bindgen(getter)]
    pub fn generated_count(&self) -> u64 {
        self.generated_count
    }
    
    /// 次の個体を生成
    /// 
    /// 戻り値: 生成された個体データ (完了時は None)
    pub fn next(&mut self) -> Option<ResolvedPokemonData> {
        if self.is_done() {
            return None;
        }
        
        // flows/ の生成ロジックを呼び出し (IV なしの RawPokemonData を取得)
        let raw = match self.config.encounter_type {
            EncounterType::Normal
            | EncounterType::Surfing
            | EncounterType::Fishing
            | EncounterType::ShakingGrass
            | EncounterType::SurfingBubble
            | EncounterType::FishingBubble => {
                generate_wild_pokemon(&mut self.lcg, &self.config)
            }
            EncounterType::StaticSymbol
            | EncounterType::StaticStarter
            | EncounterType::StaticFossil
            | EncounterType::StaticEvent
            | EncounterType::Roamer => {
                generate_static_pokemon(&mut self.lcg, &self.config)
            }
            _ => unreachable!(),
        };
        
        // IV 計算: BaseSeed から MT Seed を導出
        let ivs = resolve_ivs(self.base_seed, &self.config);
        
        self.current_advance += 1;
        self.generated_count += 1;
        
        Some(ResolvedPokemonData {
            advance: self.current_advance - 1,
            ivs,
            ..raw.into()
        })
    }
    
    /// バッチ生成 (最大 count 個)
    /// 
    /// 停止条件を満たした場合は途中で終了
    pub fn next_batch(&mut self, count: u32) -> PokemonBatch {
        let mut results = Vec::with_capacity(count as usize);
        
        for _ in 0..count {
            if self.is_done() {
                break;
            }
            if let Some(pokemon) = self.next() {
                results.push(pokemon);
            }
        }
        
        PokemonBatch {
            results,
            current_advance: self.current_advance,
            is_done: self.is_done(),
        }
    }
}
```

### 2.2 PokemonBatch

バッチ生成の結果。

```rust
#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi)]
pub struct PokemonBatch {
    /// 生成された個体
    pub results: Vec<ResolvedPokemonData>,
    /// 現在の消費数
    pub current_advance: u64,
    /// 完了したか
    pub is_done: bool,
}
```

### 2.3 EggGenerator

孵化個体用のイテレータ。基本構造は PokemonGenerator と同様。

> **MT Seed の導出ポイントに注意**
>
> 孵化個体の IV は Mersenne Twister (MT19937) から生成される。
> **MT Seed は BaseSeed (オフセット適用前) から導出される**:
>
> ```rust
> // LcgSeed::derive_mt_seed() を使用 (types.md 参照)
> let mt_seed = base_seed.derive_mt_seed();
> ```
>
> つまり、いくら LCG を進めても MT Seed は変わらない。
> 起点となる起動時刻が同じであれば、全消費位置で同一の MT Seed (= 同一の RNG IV セット) が使われる。
>
> この設計により:
> - `EggGenerator::new()` は `base_seed` から MT Seed を導出し、IV ソースを初期化
> - その後 `game_offset + user_offset` 分 LCG を進めてから列挙開始
> - 各列挙位置で生成される個体は、共通の RNG IV セットを持つ

```rust
#[wasm_bindgen]
pub struct EggGenerator {
    /// 現在の LCG 状態
    lcg: Lcg64,
    /// 生成設定
    config: EggGenerationConfig,
    /// IV ソース (BaseSeed から導出、固定)
    iv_sources: IVResolutionConditions,
    /// 現在の消費数
    current_advance: u64,
    /// 最大消費数
    max_advance: u64,
    /// 生成済み個体数
    generated_count: u64,
}

#[wasm_bindgen]
impl EggGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(
        base_seed: LcgSeed,
        config: EggGenerationConfig,
        parents: ParentsIVs,
        game_offset: u64,
        user_offset: u64,
        max_advances: u64,
    ) -> EggGenerator {
        // MT Seed は BaseSeed から導出 (オフセット適用前)
        let iv_sources = build_iv_sources(base_seed, parents);
        
        // LCG は game_offset + user_offset 進めてから列挙開始
        let mut lcg = Lcg64::new(base_seed);
        lcg.advance(game_offset + user_offset);
        
        EggGenerator {
            lcg,
            config,
            iv_sources,
            current_advance: 0,
            max_advance: max_advances,
            generated_count: 0,
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool;
    
    #[wasm_bindgen(getter)]
    pub fn current_advance(&self) -> u64;
    
    pub fn next(&mut self) -> Option<RawEggData>;
    
    pub fn next_batch(&mut self, count: u32) -> EggBatch;
}
```

## 3. Worker → Main Thread インタフェース

### 3.1 WorkerRequest

Main Thread → Worker へのリクエスト。

```typescript
export type GenerationWorkerRequest =
  | { type: 'START'; payload: GenerationStartPayload }
  | { type: 'STOP' };

export type GenerationStartPayload = {
  baseSeed: bigint;
  config: PokemonGenerationConfig;
  gameOffset: number;
  userOffset: number;
  maxAdvances: number;
  maxResults: number;
  stopAtFirstShiny: boolean;
};
```

### 3.2 WorkerResponse

Worker → Main Thread へのレスポンス。

```typescript
export type GenerationWorkerResponse =
  | { type: 'READY' }
  | { type: 'RESULTS'; payload: GenerationResultsPayload }
  | { type: 'PROGRESS'; payload: GenerationProgressPayload }
  | { type: 'COMPLETE'; payload: GenerationCompletePayload }
  | { type: 'ERROR'; message: string; fatal: boolean };

export type GenerationResultsPayload = {
  results: ResolvedPokemonData[];
  batchIndex: number;
};

export type GenerationProgressPayload = {
  currentAdvance: number;
  maxAdvance: number;
  generatedCount: number;
  elapsedMs: number;
};

export type GenerationCompletePayload = {
  reason: 'max-advances' | 'max-results' | 'first-shiny' | 'stopped';
  totalGenerated: number;
  elapsedMs: number;
  shinyFound: boolean;
};
```

## 4. Worker 実装パターン

### 4.1 基本フロー

```typescript
// generation-worker.ts
import { PokemonGenerator, type PokemonGenerationConfig } from '@wasm/wasm_pkg';

let generator: PokemonGenerator | null = null;
let stopRequested = false;

const BATCH_SIZE = 100;

self.onmessage = async (ev: MessageEvent<GenerationWorkerRequest>) => {
  const msg = ev.data;
  
  switch (msg.type) {
    case 'START': {
      const { baseSeed, config, gameOffset, userOffset, maxAdvances, maxResults, stopAtFirstShiny } = msg.payload;
      
      generator = new PokemonGenerator(
        baseSeed,
        config,
        BigInt(gameOffset),
        BigInt(userOffset),
        BigInt(maxAdvances),
      );
      stopRequested = false;
      
      const startTime = performance.now();
      let totalResults = 0;
      let shinyFound = false;
      let batchIndex = 0;
      
      while (!generator.is_done && !stopRequested) {
        const batch = generator.next_batch(BATCH_SIZE);
        
        if (batch.results.length > 0) {
          // 色違いチェック
          for (const pokemon of batch.results) {
            if (pokemon.shiny_type !== ShinyType.None) {
              shinyFound = true;
            }
          }
          
          self.postMessage({
            type: 'RESULTS',
            payload: { results: batch.results, batchIndex },
          });
          
          totalResults += batch.results.length;
          batchIndex++;
          
          // 停止条件チェック
          if (totalResults >= maxResults) {
            break;
          }
          if (stopAtFirstShiny && shinyFound) {
            break;
          }
        }
        
        // 進捗通知
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            currentAdvance: Number(generator.current_advance),
            maxAdvance: maxAdvances,
            generatedCount: totalResults,
            elapsedMs: performance.now() - startTime,
          },
        });
        
        // イベントループに制御を返す
        await yieldToEventLoop();
      }
      
      // 完了通知
      const reason = stopRequested
        ? 'stopped'
        : totalResults >= maxResults
          ? 'max-results'
          : stopAtFirstShiny && shinyFound
            ? 'first-shiny'
            : 'max-advances';
      
      self.postMessage({
        type: 'COMPLETE',
        payload: {
          reason,
          totalGenerated: totalResults,
          elapsedMs: performance.now() - startTime,
          shinyFound,
        },
      });
      
      generator = null;
      break;
    }
    
    case 'STOP':
      stopRequested = true;
      break;
  }
};

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

### 4.2 消費数と LCG 状態の関係

```
Base Seed (ユーザー入力)
    │
    ├─ game_offset 回 advance
    │
    ├─ user_offset 回 advance
    │
    └─ 個体生成ループ開始
         │
         ├─ advance=0: Seed_0 → Pokemon_0
         ├─ advance=1: Seed_1 → Pokemon_1
         ├─ advance=2: Seed_2 → Pokemon_2
         │     :
         └─ advance=N: Seed_N → Pokemon_N
```

**注意**: 個体生成時の乱数消費数はエンカウント種別により異なる。
`current_advance` は「個体境界」の消費数であり、内部の詳細消費は flows/ を参照。

## 5. フィルタリング

### 5.1 WASM 側フィルタ (オプション)

高速化のため、WASM 側でフィルタリングを行うことも可能。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonFilter {
    pub iv_ranges: Option<[IvRange; 6]>,
    pub natures: Option<Vec<u8>>,
    pub shiny_only: bool,
    pub ability_slot: Option<u8>,
    pub gender: Option<Gender>,
}

impl PokemonGenerator {
    /// フィルタ付きバッチ生成
    pub fn next_batch_filtered(
        &mut self,
        count: u32,
        filter: &PokemonFilter,
    ) -> PokemonBatch {
        // フィルタに一致する個体のみ返す
    }
}
```

### 5.2 TS 側フィルタ

軽量なフィルタリングは TS 側で行っても問題ない。

```typescript
function filterResults(
  results: ResolvedPokemonData[],
  filter: PokemonFilter,
): ResolvedPokemonData[] {
  return results.filter(pokemon => {
    if (filter.shinyOnly && pokemon.shiny_type === ShinyType.None) {
      return false;
    }
    if (filter.natures && !filter.natures.includes(pokemon.nature)) {
      return false;
    }
    // ... 他のフィルタ条件
    return true;
  });
}
```

## 6. datetime-search との統合

起動時刻検索で見つかった Seed から個体一覧を生成する場合。

### 6.1 フロー概要

```
┌─────────────────────────────────────────────────────────────────────────┐
│ datetime-search Worker                                                  │
│  - 起動条件 (DsConfig, TimeRange, SearchRange) を受信                    │
│  - HashValuesEnumerator で LCG Seed (= BaseSeed) を列挙                 │
│  - フィルタ条件にマッチする Seed を返却                                  │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ DatetimeSearchResult (含: lcg_seed, game_offset)
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Main Thread (UI)                                                        │
│  - 検索結果から BaseSeed を取得                                          │
│  - generation Worker へ個体生成リクエスト送信                            │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ GenerationStartPayload (含: baseSeed, gameOffset)
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ generation Worker                                                       │
│  - baseSeed から Generator を生成                                        │
│  - gameOffset + userOffset 分進めて列挙開始                             │
│  - (EggGenerator の場合) baseSeed から MT Seed も導出済み               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 BaseSeed の受け渡し

datetime-search の結果には以下が含まれる:

```typescript
type DatetimeSearchResult = {
  // 起動時刻情報
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  
  // ハードウェアパラメータ
  timer0: number;
  vcount: number;
  keyCode: number;
  
  // 計算結果
  lcgSeed: bigint;      // ← これが BaseSeed
  gameOffset: number;   // ← ゲーム起動条件による固定消費数
};
```

### 6.3 generation への受け渡し

```typescript
// datetime-search の結果から generation へ
function generateFromSearchResult(
  searchResult: DatetimeSearchResult,
  generationConfig: PokemonGenerationConfig,
  maxAdvances: number,
): void {
  const baseSeed = searchResult.lcgSeed;
  const gameOffset = searchResult.gameOffset;
  
  generationWorker.postMessage({
    type: 'START',
    payload: {
      baseSeed,
      config: generationConfig,
      gameOffset,
      userOffset: 0,
      maxAdvances,
      maxResults: 1000,
      stopAtFirstShiny: false,
    },
  });
}
```

### 6.4 孵化生成における MT Seed

孵化個体生成の場合、**datetime-search の結果から取得した `baseSeed` をそのまま渡す**ことで、正しい MT Seed が導出される。

```typescript
function generateEggsFromSearchResult(
  searchResult: DatetimeSearchResult,
  eggConfig: EggGenerationConfig,
  parents: ParentsIVs,
  maxAdvances: number,
): void {
  const baseSeed = searchResult.lcgSeed;
  const gameOffset = searchResult.gameOffset;
  
  // EggGenerator は baseSeed から MT Seed を内部で導出
  // gameOffset 分進めた位置から列挙を開始するが、
  // MT Seed (= IV ソース) は baseSeed 由来のまま
  eggGenerationWorker.postMessage({
    type: 'START',
    payload: {
      baseSeed,
      config: eggConfig,
      parents,
      gameOffset,
      userOffset: 0,
      maxAdvances,
      maxResults: 1000,
    },
  });
}
```

**重要**: `baseSeed` を変更すると MT Seed も変わるため、datetime-search で得られた seed をそのまま使用する必要がある。
```

## 関連ドキュメント

- [型定義](./data-structures.md)
- [解決層設計](./resolution.md)
- [生成フロー: 野生](./flows/pokemon-wild.md)
- [生成フロー: 固定・イベント](./flows/pokemon-static.md)
- [生成フロー: 孵化](./flows/egg.md)
- [datetime-search Worker インタフェース](../datetime-search/worker-interface.md)
