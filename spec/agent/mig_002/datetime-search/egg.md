# WASM API 仕様書: 孵化起動時刻検索

目標の孵化個体を生成する起動時刻を逆算する機能。

## 1. 概要

### 1.1 モジュール合成

本モジュールは以下の2つを合成する:

```
┌─────────────────────────────────────────────────────────┐
│ base.md (共通基盤)                                       │
│  HashValuesEnumerator: 起動時刻 → LCG Seed              │
└──────────────────────────┬──────────────────────────────┘
                           │ LCG Seed
                           ↓
┌─────────────────────────────────────────────────────────┐
│ generation/egg.md                                       │
│  EggGenerator: LCG Seed → 孵化個体列                     │
└──────────────────────────┬──────────────────────────────┘
                           │ EggIndividual[]
                           ↓
┌─────────────────────────────────────────────────────────┐
│ egg.md (本モジュール)                                    │
│  フィルター照合 → 条件一致した個体を出力                  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 MT Seed 検索との違い

| 項目 | MT Seed 検索 | 孵化検索 |
|------|-------------|---------|
| 照合対象 | MT Seed 値 | 生成された孵化個体 |
| 照合ロジック | Set.contains() | Filter.matches() |
| 出力 | 起動時刻のみ | 起動時刻 + 個体情報 |

### 1.3 設計原則

- **責務分離**: 起動時刻列挙 / 個体生成 / フィルタリングを独立モジュール化
- **疎結合**: 各モジュールは入出力のみで結合
- **再利用**: datetime-search, egg-generation は他機能でも使用可能

## 2. 入力型

### 2.1 EggSearchParams

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggSearchParams {
    // === 起動時刻検索 (datetime-search から) ===
    /// DS設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (開始日時 + 範囲秒数)
    pub search_range: SearchRangeParams,
    /// 探索セグメント (Timer0, VCount, KeyCode)
    pub segment: SearchSegment,
    
    // === 孵化個体生成 (egg-generation から) ===
    /// ゲーム起動設定 (Game Offset 計算用)
    pub game_start_config: GameStartConfig,
    /// ユーザー指定オフセット
    pub user_offset: u64,
    /// 検索する消費数範囲
    pub advance_range: AdvanceRange,
    /// 孵化条件
    pub conditions: EggConditions,
    /// 親個体値
    pub parents: ParentsIVs,
    
    // === フィルタリング (本モジュール) ===
    /// 個体フィルター (省略可)
    pub filter: Option<IndividualFilter>,
}
```

### 2.2 IndividualFilter

孵化個体のフィルター条件。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IndividualFilter {
    /// 各ステータスのIV範囲
    pub iv_ranges: Option<[IvRange; 6]>,
    /// 性格フィルター
    pub nature: Option<Nature>,
    /// 性別フィルター
    pub gender: Option<Gender>,
    /// 特性フィルター
    pub ability_slot: Option<AbilitySlot>,
    /// 色違いフィルター
    pub shiny_type: Option<ShinyFilter>,
    /// めざパタイプ
    pub hidden_power_type: Option<u8>,
}
```

### 2.3 IvRange

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvRange {
    pub min: u8,
    pub max: u8,
}
```

### 2.4 ShinyFilter

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyFilter {
    StarSquare,       // 色違いのみ (Star or Square)
    Star,      // 星型のみ
    Square,    // ひし形のみ
}
```

**補足**: `EggConditions`, `ParentsIVs`, `AdvanceRange` は [egg.md](../generation/egg.md) で定義。

## 3. 出力型

### 3.1 EggSearchResult

一致した起動時刻と個体情報。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggSearchResult {
    // === 起動条件 ===
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
    
    // === Seed 情報 ===
    /// LCG Seed (64-bit)
    pub lcg_seed: LcgSeed,
    
    // === 個体情報 (EggIndividual から) ===
    pub advance: u64,
    pub ivs: IvSet,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: AbilitySlot,
    pub shiny_type: ShinyType,
    pub pid: u32,
    pub hidden_power_type: u8,
    pub hidden_power_power: u8,
}
```

### 3.2 EggSearchBatch

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggSearchBatch {
    pub results: Vec<EggSearchResult>,
    pub processed_seconds: u64,
    pub total_seconds: u64,
}
```

## 4. WASM API

### 4.1 EggSearcher

datetime-search と egg-generation を合成するオーケストレータ。

```rust
#[wasm_bindgen]
pub struct EggSearcher {
    // datetime-search 共通基盤
    hash_enumerator: HashValuesEnumerator,
    
    // egg-generation パラメータ
    game_start_config: GameStartConfig,
    user_offset: u64,
    advance_range: AdvanceRange,
    conditions: EggConditions,
    parents: ParentsIVs,
    
    // フィルター
    filter: Option<IndividualFilter>,
    
    // 進捗
    total_seconds: u64,
}

#[wasm_bindgen]
impl EggSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: EggSearchParams) -> Result<EggSearcher, String> {
        // datetime-search 共通基盤を構築
        let hash_enumerator = HashValuesEnumerator::new(
            params.ds,
            params.time_range,
            params.search_range.clone(),
            params.segment,
        )?;
        
        Ok(EggSearcher {
            hash_enumerator,
            game_mode: params.game_mode,
            user_offset: params.user_offset,
            advance_range: params.advance_range,
            conditions: params.conditions,
            parents: params.parents,
            filter: params.filter,
            total_seconds: params.search_range.range_seconds as u64,
        })
    }
    
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.hash_enumerator.is_exhausted()
    }
    
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total_seconds == 0 { return 1.0; }
        self.hash_enumerator.processed_seconds() as f64 / self.total_seconds as f64
    }
    
    /// 次のバッチを検索
    pub fn next_batch(
        &mut self,
        result_limit: u32,
        chunk_seconds: u32,
    ) -> EggSearchBatch {
        let mut results = Vec::new();
        let start_processed = self.hash_enumerator.processed_seconds();
        
        while self.hash_enumerator.processed_seconds() - start_processed < chunk_seconds as u64
            && results.len() < result_limit as usize
        {
            let (entries, len) = self.hash_enumerator.next_quad();
            if len == 0 { break; }
            
            for i in 0..len as usize {
                let lcg_seed = entries[i].hash.to_lcg_seed();
                
                // egg-generation を利用して個体を生成・照合
                self.generate_and_filter(lcg_seed, &entries[i], &mut results);
                
                if results.len() >= result_limit as usize { break; }
            }
        }
        
        EggSearchBatch {
            results,
            processed_seconds: self.hash_enumerator.processed_seconds(),
            total_seconds: self.total_seconds,
        }
    }
    
    /// LCG Seed から孵化個体を生成し、フィルターに一致するものを追加
    fn generate_and_filter(
        &self,
        lcg_seed: u64,
        entry: &HashEntry,
        results: &mut Vec<EggSearchResult>,
    ) {
        // EggGenerator を構築 (egg-generation モジュール)
        let gen_params = EggGenerationParams {
            lcg_seed,
            game_mode: self.game_mode,
            user_offset: self.user_offset,
            advance_range: self.advance_range,
            conditions: self.conditions.clone(),
            parents: self.parents,
        };
        
        let mut generator = EggGenerator::new(gen_params);
        
        // バッチで生成
        while !generator.is_done() {
            let eggs = generator.next_batch(100);
            
            for egg in eggs {
                // フィルター照合
                if self.matches_filter(&egg) {
                    results.push(self.create_result(lcg_seed, entry, &egg));
                }
            }
        }
    }
    
    fn matches_filter(&self, egg: &EggIndividual) -> bool {
        let Some(filter) = &self.filter else { return true; };
        
        // IV範囲チェック
        if let Some(ranges) = &filter.iv_ranges {
            for (i, range) in ranges.iter().enumerate() {
                if egg.ivs[i] < range.min || egg.ivs[i] > range.max {
                    return false;
                }
            }
        }
        
        // 性格チェック
        if let Some(nature) = filter.nature {
            if egg.nature != nature { return false; }
        }
        
        // 性別チェック
        if let Some(gender) = filter.gender {
            if egg.gender != gender { return false; }
        }
        
        // 特性チェック
        if let Some(ability_slot) = filter.ability_slot {
            if egg.ability_slot != ability_slot { return false; }
        }
        
        // 色違いチェック
        if let Some(shiny_filter) = filter.shiny_type {
            match shiny_filter {
                ShinyFilter::StarSquare => {
                    if egg.shiny_type == ShinyType::None { return false; }
                }
                ShinyFilter::Star => {
                    if egg.shiny_type != ShinyType::Star { return false; }
                }
                ShinyFilter::Square => {
                    if egg.shiny_type != ShinyType::Square { return false; }
                }
            }
        }
        
        // めざパタイプチェック
        if let Some(hp_type) = filter.hidden_power_type {
            if egg.hidden_power_type != hp_type { return false; }
        }
        
        true
    }
    
    fn create_result(
        &self,
        lcg_seed: u64,
        entry: &HashEntry,
        egg: &EggIndividual,
    ) -> EggSearchResult {
        EggSearchResult {
            year: entry.year,
            month: entry.month,
            day: entry.day,
            hour: entry.hour,
            minute: entry.minute,
            second: entry.second,
            timer0: self.hash_enumerator.segment().timer0,
            vcount: self.hash_enumerator.segment().vcount,
            key_code: self.hash_enumerator.segment().key_code,
            lcg_seed,
            advance: egg.advance,
            ivs: egg.ivs,
            nature: egg.nature,
            gender: egg.gender,
            ability_slot: egg.ability_slot,
            shiny_type: egg.shiny_type,
            pid: egg.pid,
            hidden_power_type: egg.hidden_power_type,
            hidden_power_power: egg.hidden_power_power,
        }
    }
}
```

## 5. Worker 統合

### 5.1 メッセージ型

```typescript
export type EggSearchRequest = {
  type: 'egg-search';
  params: EggSearchParams;
};

export type EggSearchProgress = {
  processedSeconds: number;
  totalSeconds: number;
  rate: number;
  resultsCount: number;
};

export type EggSearchResponse =
  | { type: 'PROGRESS'; payload: EggSearchProgress }
  | { type: 'FOUND'; payload: EggSearchResult[] }
  | { type: 'DONE'; payload: { reason: 'completed' | 'stopped'; resultsCount: number } };
```

### 5.2 セグメント並列化

MT Seed 検索と同じくセグメント (Timer0 × VCount × KeyCode) 単位で並列化。

```typescript
const segments = generateSearchSegments(timer0Range, vcountRange, keyCodes);
const workers = segments.map(segment => {
  const worker = new Worker('./egg-search-worker.ts');
  worker.postMessage({ type: 'START', params: { ...baseParams, segment } });
  return worker;
});
```

### 5.3 Worker 実装例

```typescript
import { initWasm, EggSearcher, type EggSearchParams } from '@/lib/wasm';

self.onmessage = async (ev: MessageEvent<{ type: string; params: EggSearchParams }>) => {
  if (ev.data.type !== 'START') return;
  
  await initWasm();
  const searcher = new EggSearcher(ev.data.params);
  
  while (!searcher.is_done) {
    const batch = searcher.next_batch(10, 1000);
    
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        processedSeconds: batch.processed_seconds,
        totalSeconds: batch.total_seconds,
        rate: searcher.progress,
        resultsCount: batch.results.length,
      },
    });
    
    if (batch.results.length > 0) {
      self.postMessage({ type: 'FOUND', payload: batch.results });
    }
  }
  
  self.postMessage({ type: 'DONE', payload: { reason: 'completed' } });
};
```

## 6. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [base.md](./base.md) | 共通基盤 (HashValuesEnumerator) |
| [egg.md](../generation/egg.md) | 孵化個体生成 (EggGenerator) |
| [types.md](../common/types.md) | GameStartConfig, Nature, Gender 等 |
| [sha1-message-format.md](../common/sha1-message-format.md) | SHA-1 計算詳細 |
