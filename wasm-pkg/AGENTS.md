# Rust/WASM Guide

## Scope

- このディレクトリ配下の Rust/WASM 実装と関連テストに適用する。
- ディレクトリ構成とモジュール設計は `spec/agent/architecture/rust-structure.md` を参照する。

## Toolchain

- `rust-toolchain.toml` で指定した Rust nightly を使用する。
- Portable SIMD (`#![feature(portable_simd)]`) を使用するため nightly 必須。
- SIMD 実装はアーキテクチャ非依存の `std::simd` で統一する。

## Rules

- Rust Edition 2024 を前提にする。
- `rustfmt` と `clippy` の設定に従う。
- `#[wasm_bindgen]` エクスポートは `lib.rs` に集約する。
- TypeScript へ公開する型は `tsify` + `serde` で生成する。
- `panic!` の濫用を避ける。リリースビルドでは `panic = "abort"` になる。
- `unwrap()` / `expect()` の安易な使用を避け、`Result` / `Option` を適切に処理する。
- 不要な `unsafe` ブロックを追加しない。

## Verification

- 通常の変更は `cargo test --package wasm-pkg` または関連テストを実行する。
- GPU 関連の変更は必要に応じて `cargo test --package wasm-pkg --features gpu` を実行する。
- Lint が必要な場合は `cargo clippy --all-targets -- -D warnings` を使う。
