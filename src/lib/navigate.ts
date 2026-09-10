import { usePokemonSearchStore } from '@/features/pokemon-search/store';
import { usePokemonListStore } from '@/features/pokemon-list/store';
import type { EncounterParamsOutput } from '@/features/pokemon-list/types';
/**
 * ナビゲーションアクション
 *
 * 複数 Store を跨ぐ画面遷移ロジックを集約する。
 * navigation.ts (純粋な型・定数) と分離し、循環依存を回避する。
 */

import type { MtSeed, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { SeedOriginTransferTarget } from '@/stores/search/results';
import { useSearchResultsStore } from '@/stores/search/results';
import { useUiStore } from '@/stores/settings/ui';
import { useWonderCardListStore } from '@/features/wondercard-list/store';
import type { WonderCardSearchRequest } from '@/features/wondercard-search/types';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { serializeSeedOrigin } from '@/services/seed-origin-serde';

/**
 * MT Seed 検索結果を起動時刻検索へ引き渡してページ遷移する
 */
export function navigateToDatetimeSearch(seeds: MtSeed[]): void {
  usePokemonSearchStore.getState().setMode('iv');
  useSearchResultsStore.getState().setPendingTargetSeeds(seeds);
  useUiStore.getState().navigateToFeature('datetime-search');
}

/**
 * SeedOrigin[] を転写先 feature に引き渡してページ遷移する
 */
export function navigateWithSeedOrigins(
  origins: SeedOrigin[],
  target: SeedOriginTransferTarget
): void {
  useSearchResultsStore.getState().setPendingSeedOrigins(origins, target);
  useUiStore.getState().navigateToFeature(target);
}

/** 選択個体の検索時設定を転記する。消費範囲・フィルター・共通設定は転記先が保持する。 */
export function navigateToPokemonListFromSearch(
  origin: SeedOrigin,
  encounter: EncounterParamsOutput
): void {
  usePokemonListStore.getState().setEncounterParams((current) => ({
    ...structuredClone(encounter),
    genConfig: current.genConfig,
  }));
  useSearchResultsStore.setState((state) => ({
    pendingDetailOrigins: { ...state.pendingDetailOrigins, 'pokemon-list': origin },
  }));
  useUiStore.getState().navigateToFeature('pokemon-list');
}

/** 選択した生成元と検索開始時の設定を、一組の再現条件として転記する。 */
export function navigateToWonderCardListFromSearch(
  origin: SeedOrigin,
  request: WonderCardSearchRequest
): void {
  const { settings, origins } = structuredClone({ settings: request.settings, origins: [origin] });
  useDsConfigStore.setState({
    config: settings.ds,
    ranges: settings.ranges,
    gameStart: settings.genConfig.game_start,
    timer0Auto: settings.timer0Auto,
  });
  if (settings.card.kind === 'egg')
    useTrainerStore.getState().setTrainer(settings.params.trainer.tid, settings.params.trainer.sid);
  useWonderCardListStore.setState((state) => ({
    inputs: settings.inputs,
    selection: {
      card: settings.card,
      params: settings.params,
      language: settings.card.language,
      version: settings.ds.version,
    },
    seedInputMode: 'import',
    seedInput: {
      ...state.seedInput,
      importText: JSON.stringify(origins.map((item) => serializeSeedOrigin(item))),
    },
    seedOrigins: origins,
    formRevision: state.formRevision + 1,
  }));
  useSearchResultsStore.getState().clearPendingDetailOrigin('wondercard-list');
  useSearchResultsStore.getState().setPendingSeedOrigins(origins, 'wondercard-list');
  useUiStore.getState().navigateToFeature('wondercard-list');
}
