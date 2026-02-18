/**
 * ナビゲーションアクション
 *
 * 複数 Store を跨ぐ画面遷移ロジックを集約する。
 * navigation.ts (純粋な型・定数) と分離し、循環依存を回避する。
 */

import type { MtSeed, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { FeatureId } from '@/lib/navigation';
import { useSearchResultsStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';

/**
 * MT Seed 検索結果を起動時刻検索へ引き渡してページ遷移する
 */
export function navigateToDatetimeSearch(seeds: MtSeed[]): void {
  useSearchResultsStore.getState().setPendingTargetSeeds(seeds);
  useUiStore.getState().navigateToFeature('datetime-search');
}

/**
 * SeedOrigin[] を転写先 feature に引き渡してページ遷移する
 */
export function navigateWithSeedOrigins(origins: SeedOrigin[], target: FeatureId): void {
  useSearchResultsStore.getState().setPendingSeedOrigins(origins);
  useUiStore.getState().navigateToFeature(target);
}
