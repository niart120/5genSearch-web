# WASM API 仕様書: MT Seed 起動時刻検索

目標 MT Seed を生成する起動時刻を逆算する機能。

## 1. 概要

### 1.1 依存関係

```
base.md (共通基盤)
    └─ HashValuesEnumerator
            ↓ LCG Seed
mtseed.md (本ドキュメント)
    └─ MT Seed 照合 → 起動時刻候補
```

### 1.2 計算フロー

```
起動時刻列挙 → SHA-1 Hash → LCG Seed → MT Seed (上位32bit) → 照合
```

## 2. 入力型

### 2.1 MtseedDatetimeSearchParams

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 目標 MT Seed 列
    pub target_seeds: Vec<u32>,
    /// DS設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (開始日時 + 範囲秒数)
    pub search_range: SearchRangeParams,
    /// 探索セグメント (Timer0, VCount, KeyCode)
    pub segment: SearchSegment,
}
```

## 3. 出力型

### 3.1 MtseedDatetimeResult

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    /// 一致した MT Seed
    pub seed: u32,
    /// 年
    pub year: u16,
    /// 月
    pub month: u8,
    /// 日
    pub day: u8,
    /// 時
    pub hour: u8,
    /// 分
    pub minute: u8,
    /// 秒
    pub second: u8,
    /// Timer0値
    pub timer0: u16,
    /// VCount値
    pub vcount: u8,
    /// KeyCode値
    pub key_code: u32,
}
```

### 3.2 MtseedDatetimeSearchBatch

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch {
    pub results: Vec<MtseedDatetimeResult>,
    pub processed_seconds: u64,
    pub total_seconds: u64,
}
```

## 4. WASM API

### 4.1 MtseedDatetimeSearcher

```rust
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    target_seeds: BTreeSet<u32>,
    hash_enumerator: HashValuesEnumerator,
    total_seconds: u64,
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<MtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".to_string());
        }
        
        // 共通基盤を利用
        let hash_enumerator = HashValuesEnumerator::new(
            params.ds,
            params.time_range,
            params.search_range.clone(),
            params.segment,
        )?;
        
        Ok(MtseedDatetimeSearcher {
            target_seeds: params.target_seeds.into_iter().collect(),
            hash_enumerator,
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
    pub fn next_batch(&mut self, chunk_seconds: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let start_processed = self.hash_enumerator.processed_seconds();
        
        while self.hash_enumerator.processed_seconds() - start_processed < chunk_seconds as u64 {
            let (entries, len) = self.hash_enumerator.next_quad();
            if len == 0 { break; }
            
            for i in 0..len as usize {
                let mt_seed = entries[i].hash.to_mt_seed();
                if self.target_seeds.contains(&mt_seed) {
                    results.push(self.create_result(mt_seed, &entries[i]));
                }
            }
        }
        
        MtseedDatetimeSearchBatch {
            results,
            processed_seconds: self.hash_enumerator.processed_seconds(),
            total_seconds: self.total_seconds,
        }
    }
    
    fn create_result(&self, seed: u32, entry: &HashEntry) -> MtseedDatetimeResult {
        MtseedDatetimeResult {
            seed,
            year: entry.year,
            month: entry.month,
            day: entry.day,
            hour: entry.hour,
            minute: entry.minute,
            second: entry.second,
            timer0: self.hash_enumerator.segment().timer0,
            vcount: self.hash_enumerator.segment().vcount,
            key_code: self.hash_enumerator.segment().key_code,
        }
    }
}
```

### 4.2 探索空間分割戦略

並列化はセグメント (Timer0 × VCount × KeyCode) 単位で行う。

```typescript
const segments = generateSearchSegments(timer0Range, vcountRange, keyCodes);
const workers = segments.map(segment => {
  const worker = new Worker('./mtseed-datetime-search-worker.ts');
  worker.postMessage({ type: 'START', params: { ...baseParams, segment } });
  return worker;
});
```

#### KeyCode 生成

```typescript
function generateValidKeyCodes(keyInputMask: number): number[] {
  const codes: number[] = [];
  const bits = [];
  for (let i = 0; i < 16; i++) {
    if ((keyInputMask >> i) & 1) bits.push(i);
  }
  for (let i = 0; i < (1 << bits.length); i++) {
    let code = 0;
    for (let j = 0; j < bits.length; j++) {
      if ((i >> j) & 1) code |= (1 << bits[j]);
    }
    codes.push(code);
  }
  return codes;
}
```

## 5. Worker 統合

### 5.1 メッセージ型

```typescript
export type MtseedDatetimeSearchRequest = {
  type: 'mtseed-datetime-search';
  params: MtseedDatetimeSearchParams;
};

export type MtseedDatetimeSearchProgress = {
  processedSeconds: number;
  totalSeconds: number;
  rate: number;
};

export type MtseedDatetimeSearchResponse =
  | { type: 'PROGRESS'; payload: MtseedDatetimeSearchProgress }
  | { type: 'FOUND'; payload: MtseedDatetimeResult[] }
  | { type: 'DONE' };
```

### 5.2 UI 側進捗表示

| 項目 | 計算方法 |
|------|----------|
| スループット | `processedSeconds / elapsedWallTime` |
| 経過時間 | `Date.now() - startTime` |
| 想定残時間 | `(totalSeconds - processedSeconds) / throughput` |

### 5.3 Worker 実装例

```typescript
import { initWasm, MtseedDatetimeSearcher, type MtseedDatetimeSearchParams } from '@/lib/wasm';

self.onmessage = async (ev: MessageEvent<{ type: string; params: MtseedDatetimeSearchParams }>) => {
  if (ev.data.type !== 'START') return;
  
  await initWasm();
  const searcher = new MtseedDatetimeSearcher(ev.data.params);
  
  while (!searcher.is_done) {
    const batch = searcher.next_batch(1000);
    
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        processedSeconds: batch.processed_seconds,
        totalSeconds: batch.total_seconds,
        rate: searcher.progress,
      },
    });
    
    if (batch.results.length > 0) {
      self.postMessage({ type: 'FOUND', payload: batch.results });
    }
  }
  
  self.postMessage({ type: 'DONE' });
};
```

## 6. GPU 最適化

起動時刻検索は並列性が高く、GPU計算に適している。

```rust
#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuContext {
    pub async fn search_mtseed_datetime(
        &self,
        params: MtseedDatetimeSearchParams,
    ) -> Result<Vec<MtseedDatetimeResult>, String> {
        // 計算シェーダーで並列検索
        todo!()
    }
}
```

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [base.md](./base.md) | 共通基盤 (HashValuesEnumerator) |
| [types.md](../common/types.md) | DsConfig, SearchSegment 等 |
| [sha1-message-format.md](../common/sha1-message-format.md) | SHA-1 計算詳細 |
| [api.md](../gpu/api.md) | GPU API |
