# リアーキテクチャ仕様書

計算ロジックをWASMに集約することを目的とした再設計ドキュメント群。

## ドキュメント構成

| ファイル | 説明 | 状態 |
|---------|------|------|
| [01-current-analysis.md](01-current-analysis.md) | 現行アーキテクチャ分析 | Active |
| [02-target-architecture.md](02-target-architecture.md) | 目標アーキテクチャ設計 | Active |
| [03-wasm-api-design.md](03-wasm-api-design.md) | WASM API設計 | Active |
| [04-migration-plan.md](04-migration-plan.md) | 移行計画 | Active |

## 設計原則

1. **計算ロジックのWASM集約**: TypeScript側は表示・UI状態に専念
2. **明確なレイヤー分離**: UI / WorkerService / WASM の責務境界を厳格化
3. **Worker-first設計**: WASMはWorker内でのみ呼び出す
4. **CPU/GPU経路はユーザー選択**: 自動切替えは行わない
5. **テスト容易性**: 各レイヤーが独立してテスト可能

## 移行フェーズ

```
Phase 0: 基盤整備
Phase 1: Worker設計 + WASM API境界定義
Phase 2: コア機能実装（計算ロジック + 静的データ）
Phase 3: UI統合 + TypeScript計算ロジック削除
```

## 参照元

- 元リポジトリ: https://github.com/niart120/pokemon-gen5-initseed
