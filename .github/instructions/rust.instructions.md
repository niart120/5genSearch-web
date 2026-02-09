---
applyTo: '{**/wasm-pkg/**/*.rs,spec/agent/*/local_*/*.md}'
---

# Rust (WASM) コーディング規約

## ディレクトリ構成

ディレクトリ構成・モジュール設計については下記仕様書を参照:

→ [spec/agent/architecture/rust-structure.md](../../spec/agent/architecture/rust-structure.md)

## ツールチェイン

- **Rust nightly** を使用 (`rust-toolchain.toml` で指定)
- Portable SIMD (`#![feature(portable_simd)]`) を使用するため nightly 必須
- SIMD 実装はアーキテクチャ非依存 (`std::simd`) で統一

## 基本規約

- Rust Edition 2024
- `rustfmt` / `clippy` 設定に準拠
- `#[wasm_bindgen]` エクスポートは `lib.rs` に集約
- 型定義は `tsify` + `serde` で TypeScript 型を自動生成

## 禁止事項

- `panic!` の濫用 (リリースビルドでは `panic = "abort"`)
- `unwrap()` / `expect()` の安易な使用 (Result/Option を適切に処理)
- `unsafe` ブロックの不必要な使用
