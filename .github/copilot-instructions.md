# ポケモン BW/BW2 乱数調整 WebApp

## はじめに
ユーザとの対話は日本語で行うこと。

## プロジェクト概要
ポケットモンスター ブラック・ホワイト/ブラック2・ホワイト2の乱数調整を行うwebアプリケーション

**参照**: https://github.com/niart120/pokemon-gen5-initseed のリアーキテクチャを目的とする

## 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite
- **計算エンジン**: Web Workers + Rust(wgpu + simd) + WebAssembly (wasm-pack + wasm-bindgen)
- **UI**: Radix UI components

## アーキテクチャ原則
- **本番・開発コードの分離**: 本番環境に不要なコードを含めない
- **依存関係の整理**: 循環依存や不適切な依存を避ける
- **テスト環境の整備**: 開発効率を高める包括的テストシステム

## コーディング規約
- TypeScript strict mode 使用
- React function-based components 使用
- ESLint/Prettier設定に準拠
- 技術文書は事実ベース・簡潔に記述
- t_wada氏が推奨するテスト駆動開発(TDD)指針/コーディング指針を遵守
  - Code      → How
  - Tests     → What
  - Commits   → Why
  - Comments  → Why not

## シェルの前提
- コマンド例は **PowerShell（pwsh）構文**で書くこと。
- **bash / zsh / sh 前提のコマンドは出さない**（例: `export`, `VAR=value cmd`, `&&` 連結前提、`sed -i`, `cp -r`, `rm -rf` などのUnix系定番をそのまま出さない）。
- Windows 組み込みコマンドでも良いが、基本は **PowerShell のコマンドレット**を優先する。
