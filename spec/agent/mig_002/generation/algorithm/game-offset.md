# アルゴリズム: Game Offset 計算

ゲーム起動時の固定乱数消費 (Game Offset) の計算仕様。

## 1. 概要

ゲーム起動から個体生成可能になるまでの間、ゲーム内部処理により LCG が固定回数消費される。
この消費数を **Game Offset** と呼ぶ。

```
Initial Seed (SHA-1 計算結果)
    │
    ├─ Game Offset 適用 (本仕様)
    │   └─ LCG を固定回数消費
    │
    ├─ User Offset 適用
    │   └─ ユーザー指定の追加消費
    │
    └─ 個体生成開始
```

Game Offset は以下の要素により変動する:
- ゲームバージョン (BW / BW2)
- 起動方法 (最初から / 続きから)
- セーブ状態 (セーブなし / セーブあり / 思い出リンク済み)

## 2. 起動設定型

### 2.1 StartMode

起動方法。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum StartMode {
    /// 最初から (New Game)
    NewGame,
    /// 続きから (Continue)
    Continue,
}
```

### 2.2 SaveState

セーブ状態。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SaveState {
    /// セーブデータなし
    NoSave,
    /// セーブデータあり
    WithSave,
    /// セーブデータあり + 思い出リンク済み (BW2 のみ)
    WithMemoryLink,
}
```

### 2.3 GameStartConfig

起動設定。`RomVersion` と組み合わせて Game Offset を計算する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    pub start_mode: StartMode,
    pub save_state: SaveState,
}
```

```typescript
export type StartMode = 'NewGame' | 'Continue';
export type SaveState = 'NoSave' | 'WithSave' | 'WithMemoryLink';

export type GameStartConfig = {
  start_mode: StartMode;
  save_state: SaveState;
};
```

### 2.4 有効な組み合わせ

| RomVersion | StartMode | SaveState | 有効 | 備考 |
|------------|-----------|-----------|------|------|
| BW | NewGame | NoSave | ✓ | 初回起動 |
| BW | NewGame | WithSave | ✓ | セーブあり状態で「最初から」 |
| BW | NewGame | WithMemoryLink | ✗ | BW に思い出リンクなし |
| BW | Continue | NoSave | ✗ | セーブなしで続きからは不可 |
| BW | Continue | WithSave | ✓ | 通常の続きから |
| BW | Continue | WithMemoryLink | ✗ | BW に思い出リンクなし |
| BW2 | NewGame | NoSave | ✓ | 初回起動 |
| BW2 | NewGame | WithSave | ✓ | セーブあり状態で「最初から」 |
| BW2 | NewGame | WithMemoryLink | ✓ | 思い出リンク済みで「最初から」 |
| BW2 | Continue | NoSave | ✗ | セーブなしで続きからは不可 |
| BW2 | Continue | WithSave | ✓ | 続きから (思い出リンクなし) |
| BW2 | Continue | WithMemoryLink | ✓ | 続きから (思い出リンク済み) |

### 2.5 バリデーション

```rust
impl GameStartConfig {
    pub fn validate(&self, version: RomVersion) -> Result<(), String> {
        let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);
        
        // 思い出リンクは BW2 のみ
        if self.save_state == SaveState::WithMemoryLink && !is_bw2 {
            return Err("MemoryLink is only available in BW2".to_string());
        }
        
        // 続きからはセーブ必須
        if self.start_mode == StartMode::Continue && self.save_state == SaveState::NoSave {
            return Err("Continue requires a save file".to_string());
        }
        
        Ok(())
    }
}
```

## 3. 内部処理の種類

Game Offset は複数の内部処理の組み合わせで構成される。

### 3.1 乱数消費 (Rand)

単純な LCG 1回消費。

```rust
fn consume_random(&mut self, count: u32) {
    for _ in 0..count {
        self.rng.next();
        self.advances += 1;
    }
}
```

### 3.2 Probability Table 処理 (PT)

確率テーブル参照処理。内部で複数回の乱数消費が発生する。

```rust
/// Probability Table 1回処理
/// 消費数は Seed 依存 (1-10 程度)
fn probability_table_process(&mut self) {
    loop {
        let r = self.rng.next();
        self.advances += 1;
        
        // 上位ビットで終了判定
        if (r >> 32) < THRESHOLD {
            break;
        }
    }
}

/// Probability Table 複数回処理
fn probability_table_process_multiple(&mut self, count: u32) {
    for _ in 0..count {
        self.probability_table_process();
    }
}
```

**特性**: PT 処理の消費数は Seed 値に依存するため、固定値ではない。

### 3.3 チラーミィ PID 決定 (BW)

BW の「最初から」で使用。ゲーム内 NPC のチラーミィの PID を決定。

```rust
fn generate_chiramii_pid(&mut self) {
    // PID 決定: 2回消費
    self.rng.next(); // PID 上位
    self.rng.next(); // PID 下位
    self.advances += 2;
}
```

### 3.4 チラーミィ ID 決定 (BW)

```rust
fn generate_chiramii_id(&mut self) {
    // ID 決定: 1回消費
    self.rng.next();
    self.advances += 1;
}
```

### 3.5 チラチーノ PID 決定 (BW2)

BW2 の「最初から」で使用。

```rust
fn generate_chirachino_pid(&mut self) {
    // PID 決定: 2回消費
    self.rng.next();
    self.rng.next();
    self.advances += 2;
}
```

### 3.6 チラチーノ ID 決定 (BW2)

```rust
fn generate_chirachino_id(&mut self) {
    // ID 決定: 1回消費
    self.rng.next();
    self.advances += 1;
}
```

### 3.7 TID/SID 決定

プレイヤーのトレーナー ID を決定。「最初から」でのみ発生。

```rust
fn calculate_tid_sid(&mut self) -> (u16, u16) {
    let tid_rand = self.rng.next();
    let sid_rand = self.rng.next();
    self.advances += 2;
    
    let tid = ((tid_rand >> 32) as u32 % 65536) as u16;
    let sid = ((sid_rand >> 32) as u32 % 65536) as u16;
    (tid, sid)
}
```

### 3.8 Extra 処理 (BW2)

BW2 の「続きから」で発生する追加処理。消費数は Seed 依存。

```rust
fn extra_process(&mut self) {
    // 詳細は Seed 依存の複雑な処理
    // 平均的に数回の消費が発生
}
```

## 4. モード別オフセット計算

### 4.1 BW 最初から (セーブあり)

```rust
// BwNewGameWithSave
fn calculate_bw_new_game_with_save(&mut self) {
    self.probability_table_process_multiple(2); // PT×2
    self.generate_chiramii_pid();               // チラーミィPID
    self.generate_chiramii_id();                // チラーミィID
    self.calculate_tid_sid();                   // TID/SID
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(4); // PT×4
    // 住人決定は別途計算 (オフセットには含めない)
}
```

### 4.2 BW 最初から (セーブなし)

```rust
// BwNewGameNoSave
fn calculate_bw_new_game_no_save(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(4); // PT×4
}
```

### 4.3 BW 続きから

```rust
// BwContinue
fn calculate_bw_continue(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(5); // PT×5
}
```

### 4.4 BW2 最初から (思い出リンク + セーブあり)

```rust
// Bw2NewGameWithMemoryLinkSave
fn calculate_bw2_new_game_with_memory_link_save(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(2);                     // Rand×2
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(2);                     // Rand×2
    self.generate_chirachino_pid();             // チラチーノPID
    self.generate_chirachino_id();              // チラチーノID
    self.calculate_tid_sid();                   // TID/SID
}
```

### 4.5 BW2 最初から (セーブあり、思い出リンクなし)

```rust
// Bw2NewGameNoMemoryLinkSave
fn calculate_bw2_new_game_no_memory_link_save(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(3);                     // Rand×3
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(2);                     // Rand×2
    self.generate_chirachino_pid();             // チラチーノPID
    self.generate_chirachino_id();              // チラチーノID
    self.calculate_tid_sid();                   // TID/SID
}
```

### 4.6 BW2 最初から (セーブなし)

```rust
// Bw2NewGameNoSave
fn calculate_bw2_new_game_no_save(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(4);                     // Rand×4
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(2);                     // Rand×2
    self.generate_chirachino_pid();             // チラチーノPID
    self.generate_chirachino_id();              // チラチーノID
    self.calculate_tid_sid();                   // TID/SID
}
```

### 4.7 BW2 続きから (思い出リンクあり)

```rust
// Bw2ContinueWithMemoryLink
fn calculate_bw2_continue_with_memory_link(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(2);                     // Rand×2
    self.probability_table_process_multiple(4); // PT×4
    self.extra_process();                       // Extra処理
}
```

### 4.8 BW2 続きから (思い出リンクなし)

```rust
// Bw2ContinueNoMemoryLink
fn calculate_bw2_continue_no_memory_link(&mut self) {
    self.consume_random(1);                     // Rand×1
    self.probability_table_process_multiple(1); // PT×1
    self.consume_random(3);                     // Rand×3
    self.probability_table_process_multiple(4); // PT×4
    self.extra_process();                       // Extra処理
}
```

## 5. 統合 API

### 5.1 オフセット計算

```rust
/// Game Offset を計算
pub fn calculate_game_offset(
    initial_seed: u64,
    version: RomVersion,
    config: &GameStartConfig,
) -> u32 {
    config.validate(version).expect("Invalid config");
    
    let mut calculator = OffsetCalculator::new(initial_seed);
    let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);
    
    match (is_bw2, config.start_mode, config.save_state) {
        // BW
        (false, StartMode::NewGame, SaveState::WithSave) => {
            calculator.calculate_bw_new_game_with_save()
        }
        (false, StartMode::NewGame, SaveState::NoSave) => {
            calculator.calculate_bw_new_game_no_save()
        }
        (false, StartMode::Continue, _) => {
            calculator.calculate_bw_continue()
        }
        
        // BW2
        (true, StartMode::NewGame, SaveState::WithMemoryLink) => {
            calculator.calculate_bw2_new_game_with_memory_link_save()
        }
        (true, StartMode::NewGame, SaveState::WithSave) => {
            calculator.calculate_bw2_new_game_no_memory_link_save()
        }
        (true, StartMode::NewGame, SaveState::NoSave) => {
            calculator.calculate_bw2_new_game_no_save()
        }
        (true, StartMode::Continue, SaveState::WithMemoryLink) => {
            calculator.calculate_bw2_continue_with_memory_link()
        }
        (true, StartMode::Continue, SaveState::WithSave) => {
            calculator.calculate_bw2_continue_no_memory_link()
        }
        
        _ => unreachable!("Invalid combination"),
    }
    
    calculator.advances
}
```

### 5.2 オフセット適用

```rust
/// 初期 Seed に Game Offset を適用
pub fn apply_game_offset(
    initial_seed: u64,
    version: RomVersion,
    config: &GameStartConfig,
) -> u64 {
    let offset = calculate_game_offset(initial_seed, version, config);
    PersonalityRNG::jump_seed(initial_seed, offset as u64)
}
```

## 6. 消費数まとめ

| モード | 固定消費 | PT回数 | Extra | 備考 |
|-------|---------|--------|-------|------|
| BW NewGame (セーブあり) | 6 | 6 | - | チラーミィPID/ID + TID/SID |
| BW NewGame (セーブなし) | 1 | 4 | - | |
| BW Continue | 1 | 5 | - | |
| BW2 NewGame (ML+セーブ) | 10 | 2 | - | チラチーノPID/ID + TID/SID |
| BW2 NewGame (セーブ) | 11 | 2 | - | |
| BW2 NewGame (セーブなし) | 12 | 2 | - | |
| BW2 Continue (ML) | 3 | 5 | ✓ | |
| BW2 Continue (no ML) | 4 | 5 | ✓ | |

**注意**: 実際のオフセット値は PT 処理と Extra 処理が Seed 依存のため変動する。

## 7. テストケース (実測値)

| Seed | モード | オフセット |
|------|--------|-----------|
| 0x12345678 | BW NewGame (セーブあり) | 59 |
| 0x12345678 | BW NewGame (セーブなし) | 45 |
| 0x12345678 | BW Continue | 49 |
| 0x90ABCDEF | BW2 NewGame (ML+セーブ) | 29 |
| 0x90ABCDEF | BW2 NewGame (セーブ) | 29 |
| 0x90ABCDEF | BW2 NewGame (セーブなし) | 44 |
| 0x90ABCDEF | BW2 Continue (ML) | 55 |
| 0x90ABCDEF | BW2 Continue (no ML) | 55 |

## 関連ドキュメント

- [共通型定義](../../common/types.md) - `RomVersion`, `StartMode`, `SaveState`
- [LCG 仕様](../../common/rng.md) - LCG 実装詳細
- [生成フロー: 野生](../flows/pokemon-wild.md) - Game Offset 適用後の処理
