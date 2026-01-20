---
applyTo: '**/wasm-pkg/**/*.rs'
---

# Rust (WASM) コーディング規約

## ディレクトリ構成

ディレクトリ構成・モジュール設計については下記仕様書を参照:

→ [spec/architecture/rust-structure.md](../../spec/architecture/rust-structure.md)

## 基本規約

- Rust Edition 2024
- `rustfmt` / `clippy` 設定に準拠
- `#[wasm_bindgen]` エクスポートは `lib.rs` に集約
- 型定義は `tsify-next` + `serde` で TypeScript 型を自動生成

## 禁止事項

- `panic!` の濫用 (リリースビルドでは `panic = "abort"`)
- `unwrap()` / `expect()` の安易な使用 (Result/Option を適切に処理)
- `unsafe` ブロックの不必要な使用
