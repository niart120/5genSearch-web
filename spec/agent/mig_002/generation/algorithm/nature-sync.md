# アルゴリズム: 性格決定・シンクロ処理

性格の決定とシンクロ特性による性格固定のアルゴリズム。

## 1. 性格決定

### 1.1 乱数から性格を決定

```rust
/// 乱数から性格 ID を決定 (0-24)
pub fn nature_roll(r: u32) -> u8 {
    ((r as u64 * 25) >> 32) as u8
}
```

**計算方法**: 32bit 乱数を 25 で割った商ではなく、乗算とシフトで高速に計算。

> **Note:** BW/BW2 では性格は PID とは独立して乱数から決定される。
> `pid % 25` による性格導出は第3世代以前の仕様であり、本作では使用しない。

## 2. シンクロ判定

### 2.1 シンクロ対応エンカウント

| エンカウント種別 | シンクロ対応 |
|----------------|------------|
| Normal (草むら・洞窟) | ○ |
| Surfing | ○ |
| Fishing | ○ |
| ShakingGrass (揺れる草むら) | ○ |
| DustCloud (砂煙) | ○ |
| PokemonShadow (橋の影) | ○ |
| SurfingBubble (水上の泡) | ○ |
| FishingBubble (釣りの泡) | ○ |
| StaticSymbol | ○ |
| StaticStarter | × |
| StaticFossil | × |
| StaticEvent | × |
| Roamer | × |

### 2.2 シンクロ判定

```rust
/// シンクロ成否判定
/// (r * 2) >> 32 == 1 で成功 (最上位ビットが1)
pub fn sync_check(r: u32) -> bool {
    ((r as u64 * 2) >> 32) == 1
}
```

### 2.3 シンクロ判定処理

シンクロ対応エンカウントでは、シンクロ有効/無効に関わらず乱数を消費する。

```rust
/// シンクロ判定を実行
pub fn perform_sync_check(
    rng: &mut Lcg,
    encounter_type: EncounterType,
    sync_enabled: bool,
) -> bool {
    if !supports_sync(encounter_type) {
        return false;  // 乱数消費なし
    }
    
    let r = rng.next();  // 対応エンカウントでは常に消費
    
    sync_enabled && sync_check(r)
}
```

### 2.4 性格決定 (シンクロ考慮)

性格用の乱数消費は常に発生する。シンクロ成功時は結果を無視。

```rust
/// 性格決定 (シンクロ考慮)
pub fn generate_nature_with_sync(
    rng: &mut Lcg,
    sync_success: bool,
    sync_nature_id: u8,
) -> (bool, u8) {
    let rng_nature = nature_roll(rng.next());  // 常に消費
    
    if sync_success {
        (true, sync_nature_id)
    } else {
        (false, rng_nature)
    }
}
```

## 3. かわらずのいし (Everstone)

孵化時、親がかわらずのいしを持っていると性格が固定される。

### 3.1 BW/BW2 の仕様

| 条件 | 効果 |
|-----|------|
| ♀親がかわらずのいし所持 | 50% で♀親の性格を遺伝 |
| メタモン使用時、メタモンが所持 | 50% でメタモンの性格を遺伝 |

### 3.2 判定処理

性格用乱数を先に消費し、その後かわらずのいし判定を行う。

```rust
/// 孵化時の性格決定
pub fn determine_egg_nature(
    rng: &mut Lcg,
    everstone: EverstonePlan,
) -> Nature {
    // 先に性格ロール (常に消費)
    let nature_idx = rng.roll_fraction(25) as u8;
    
    match everstone {
        EverstonePlan::None => {
            Nature::from_index(nature_idx)
        }
        EverstonePlan::Fixed(parent_nature) => {
            // かわらずのいし判定: 最上位ビットが 0 で成功
            let inherit = (rng.next() >> 31) == 0;
            if inherit {
                parent_nature
            } else {
                Nature::from_index(nature_idx)
            }
        }
    }
}
```

> **Note:** 乱数消費順序の詳細は [生成フロー](../flows/) を参照。

## 関連ドキュメント

- [PID 生成・色違い判定](./pid-shiny.md)
- [生成フロー: 野生](../flows/pokemon-wild.md)
- [生成フロー: 孵化](../flows/egg.md)
