# アルゴリズム: PID 生成・色違い判定

PID (Personality ID) の生成と色違い判定のアルゴリズム。

## 1. PID 生成

### 1.1 基本式

BW/BW2 では、エンカウント種別により PID 生成式が異なる。

| 種別 | 生成式 | ID 補正 |
|-----|--------|--------|
| 野生 (Normal, Surfing, Fishing, 特殊) | `r1 ^ 0x10000` | あり |
| 固定シンボル (StaticSymbol) | `r1 ^ 0x10000` | あり |
| 徘徊 (Roamer) | `r1 ^ 0x10000` | あり |
| イベント (StaticStarter, StaticFossil, StaticEvent) | `r1 ^ 0x10000` | なし |
| ギフト | `(r1 & 0xFFFF) << 16 \| (r2 & 0xFFFF)` | なし |

```rust
/// 基本 PID 生成 (XOR 0x10000)
pub fn generate_base_pid(r1: u32) -> u32 {
    r1 ^ 0x10000
}

/// ギフト PID 生成 (2乱数合成)
pub fn generate_gift_pid(r1: u32, r2: u32) -> u32 {
    ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF)
}
```

### 1.2 ID 補正

PID の最上位ビットを調整する処理。

```rust
/// ID 補正処理
/// (pid_low ^ tid ^ sid) の奇偶性で最上位ビットを調整
pub fn apply_id_correction(pid: u32, tid: u16, sid: u16) -> u32 {
    let pid_low = (pid & 0xFFFF) as u16;
    let xor_value = pid_low ^ tid ^ sid;
    
    if xor_value & 1 == 1 {
        pid ^ 0x80000000  // 最上位ビット反転
    } else {
        pid
    }
}
```

### 1.3 エンカウント別 PID 生成

エンカウント種別による差異は以下の2軸で分類される:

| 分類軸 | パターン |
|-------|----------|
| 乱数消費 | 1個 (野生/固定/徘徊/イベント) / 2個 (ギフト/タマゴ) |
| ID補正 | あり (野生/固定/徘徊) / なし (イベント/ギフト/タマゴ) |

```rust
// 基本演算の合成で対応
// 野生/固定/徘徊 (ID補正あり)
let pid = apply_id_correction(generate_base_pid(r1), tid, sid);

// イベント (ID補正なし)
let pid = generate_base_pid(r1);

// ギフト/タマゴ (2乱数合成、ID補正なし)
let pid = generate_gift_pid(r1, r2);
```

#### 便宜的ラッパー関数

可読性のため、エンカウント種別ごとのラッパーを提供する。
内部実装は基本演算の合成。

```rust
/// 野生/固定/徘徊 PID (ID補正あり)
pub fn generate_wild_pid(r1: u32, tid: u16, sid: u16) -> u32 {
    apply_id_correction(generate_base_pid(r1), tid, sid)
}

/// イベント PID (ID補正なし)
pub fn generate_event_pid(r1: u32) -> u32 {
    generate_base_pid(r1)
}

/// ギフト/タマゴ PID (2乱数合成)
pub fn generate_gift_pid(r1: u32, r2: u32) -> u32 {
    ((r1 & 0xFFFF) << 16) | (r2 & 0xFFFF)
}
```

> **Note:** `generate_static_pid` / `generate_roamer_pid` は `generate_wild_pid` と同一実装のため統合可能。
> 呼び出し側で意図を明示したい場合はエイリアスとして残してもよい。

## 2. 色違い判定

### 2.1 Shiny Value 計算

```rust
/// Shiny Value 計算
pub fn calculate_shiny_value(tid: u16, sid: u16, pid: u32) -> u16 {
    let pid_high = (pid >> 16) as u16;
    let pid_low = (pid & 0xFFFF) as u16;
    tid ^ sid ^ pid_high ^ pid_low
}
```

### 2.2 色違い判定

```rust
/// 色違いか判定
pub fn is_shiny(tid: u16, sid: u16, pid: u32) -> bool {
    calculate_shiny_value(tid, sid, pid) < 8
}

/// 色違い種別判定
pub fn check_shiny_type(tid: u16, sid: u16, pid: u32) -> ShinyType {
    let sv = calculate_shiny_value(tid, sid, pid);
    match sv {
        0 => ShinyType::Square,      // ◇ (sv == 0)
        1..=7 => ShinyType::Star,    // ☆ (1 <= sv < 8)
        _ => ShinyType::None,        // 通常
    }
}
```

## 3. 色違いロック

特定のポケモン (ゼクロム・レシラム・配布等) は色違いにならないようロックされている。

```rust
/// 色違いロック処理
/// 色違いの場合、PID を補正して非色違いにする
pub fn apply_shiny_lock(pid: u32, tid: u16, sid: u16) -> u32 {
    if is_shiny(tid, sid, pid) {
        pid ^ 0x10000000  // 上位ニブルを反転
    } else {
        pid
    }
}
```

## 4. 色違いリロール

ひかるおまもり・国際孵化により、色違い判定の追加試行が発生する。

### 4.1 リロール回数

| 条件 | リロール回数 |
|-----|------------|
| 通常 | 0 |
| ひかるおまもり (BW2) | 2 |
| 国際孵化 | 5 |
| 国際孵化 + ひかるおまもり (BW2) | 7 |

### 4.2 汎用リロール処理

エンカウント種別ごとに PID 生成ロジックが異なるため、
クロージャでロジックを注入する設計とする。

```rust
/// 汎用 PID 生成 (リロール対応)
/// 
/// # Arguments
/// * `rng` - 乱数生成器
/// * `tid` / `sid` - トレーナーID
/// * `reroll_count` - 追加リロール回数 (0, 2, 5, 7)
/// * `pid_generator` - PID 生成関数 (rng を受け取り PID を返す)
pub fn generate_pid_with_reroll<F>(
    rng: &mut Lcg,
    tid: u16,
    sid: u16,
    reroll_count: u8,
    mut pid_generator: F,
) -> u32
where
    F: FnMut(&mut Lcg) -> u32,
{
    let mut last_pid = pid_generator(rng);
    
    if is_shiny(tid, sid, last_pid) {
        return last_pid;
    }
    
    for _ in 0..reroll_count {
        let pid = pid_generator(rng);
        if is_shiny(tid, sid, pid) {
            return pid;
        }
        last_pid = pid;
    }
    
    last_pid
}
```

### 4.3 使用例

```rust
// 野生 + ひかるおまもり
let pid = generate_pid_with_reroll(rng, tid, sid, 2, |rng| {
    generate_wild_pid(rng.next(), tid, sid)
});

// 孵化 + 国際孵化 + ひかるおまもり
let pid = generate_pid_with_reroll(rng, tid, sid, 7, |rng| {
    generate_gift_pid(rng.next(), rng.next())
});
```

### 4.4 高レベルヘルパー関数

flows ドキュメントから参照される、設定ベースの PID 生成関数。

```rust
/// 野生/固定シンボル用 PID 生成 (ひかるおまもり対応)
pub fn generate_pokemon_pid_wild(
    rng: &mut Lcg,
    tid: u16,
    sid: u16,
    shiny_charm: bool,
) -> u32 {
    let reroll_count = if shiny_charm { 2 } else { 0 };
    generate_pid_with_reroll(rng, tid, sid, reroll_count, |rng| {
        generate_wild_pid(rng.next(), tid, sid)
    })
}

/// イベント系 PID 生成 (ID補正なし、色違いロック対応)
pub fn generate_pokemon_pid_event(
    rng: &mut Lcg,
    tid: u16,
    sid: u16,
    shiny_locked: bool,
) -> u32 {
    let pid = generate_event_pid(rng.next());
    if shiny_locked {
        apply_shiny_lock(pid, tid, sid)
    } else {
        pid
    }
}
```

## 5. PID から導出される値

### 5.1 性格

> **Note:** BW/BW2 では性格は PID とは独立して乱数から決定される。
> `pid % 25` による性格導出は第3世代の仕様であり、本作では使用しない。
> 詳細は [性格・シンクロ](./nature-sync.md) を参照。

### 5.2 特性スロット

```rust
pub fn ability_slot_from_pid(pid: u32) -> u8 {
    ((pid >> 16) & 1) as u8
}
```

### 5.3 性別値

```rust
pub fn gender_value_from_pid(pid: u32) -> u8 {
    (pid & 0xFF) as u8
}
```

## 関連ドキュメント

- [性格・シンクロ](./nature-sync.md)
- [生成フロー: 野生](../flows/pokemon-wild.md)
- [生成フロー: 固定・イベント](../flows/pokemon-static.md)
- [生成フロー: 孵化](../flows/egg.md)
