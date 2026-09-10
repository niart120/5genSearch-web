import { beforeEach, expect, it } from 'vitest';
import { navigateToWonderCardListFromSearch } from '@/lib/navigate';
import {
  useWonderCardListStore,
  getWonderCardListInitialState,
} from '@/features/wondercard-list/store';
import {
  getWonderCardInitialFormState,
  resolveWonderCardSelection,
} from '@/features/wondercard-list/types';
import { getWonderCardSearchInitialState } from '@/features/wondercard-search/store';
import type { WonderCardSearchRequest } from '@/features/wondercard-search/types';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { useUiStore } from '@/stores/settings/ui';
import { useSearchResultsStore } from '@/stores/search/results';
import { useProfileStore } from '@/stores/settings/profile';
import { parseSerializedSeedOrigins } from '@/services/seed-origin-serde';
import { getCategoryDef, getCategoryByFeature } from '@/lib/navigation';
import { UI_CARD, UI_EGG_CARD, UI_ORIGIN } from '../fixtures/wondercards/ui';

function request(card = UI_EGG_CARD): WonderCardSearchRequest {
  const ds = structuredClone(getDsConfigInitialState());
  const selection = resolveWonderCardSelection(card, ds.config, { tid: 0, sid: 65_535 })!;
  const inputs = { ...getWonderCardInitialFormState(), cardId: card.id };
  return {
    ...getWonderCardSearchInitialState(),
    settings: {
      card: structuredClone(card),
      params: selection.params,
      inputs,
      genConfig: { ...inputs.genConfig, version: ds.config.version, game_start: ds.gameStart },
      filter: undefined,
      ds: ds.config,
      ranges: ds.ranges,
      timer0Auto: true,
    },
  };
}

beforeEach(() => {
  useWonderCardListStore.setState(getWonderCardListInitialState());
  useSearchResultsStore.getState().clearResults();
});

it('両カテゴリの第三タブとして登録し、カテゴリ内の選択を復元する', () => {
  expect(getCategoryDef('search').features).toEqual([
    'datetime-search',
    'egg-search',
    'wondercard-search',
  ]);
  expect(getCategoryDef('generation').features).toEqual([
    'pokemon-list',
    'egg-list',
    'wondercard-list',
  ]);
  expect(getCategoryByFeature('wondercard-search')).toBe('search');
  useUiStore.getState().navigateToFeature('wondercard-list');
  useUiStore.getState().setActiveCategory('search');
  useUiStore.getState().setActiveCategory('generation');
  expect(useUiStore.getState().activeFeature).toBe('wondercard-list');
});

it('DS を一度で反映し、プロフィールを変更せず、Startup 一件を一度だけ渡す', () => {
  const snapshot = request();
  const profiles = structuredClone(useProfileStore.getState().profiles);
  useDsConfigStore.getState().setConfig({ region: 'Usa', version: 'White2' });
  useTrainerStore.getState().setTrainer(111, 222);
  let changes = 0;
  const unsub = useDsConfigStore.subscribe(() => {
    changes++;
  });
  navigateToWonderCardListFromSearch(UI_ORIGIN, snapshot);
  unsub();
  expect(changes).toBe(1);
  const list = useWonderCardListStore.getState();
  expect(list.inputs).toEqual(snapshot.settings.inputs);
  expect(list.selection?.params).toEqual(snapshot.settings.params);
  expect(parseSerializedSeedOrigins(list.seedInput.importText)).toEqual([UI_ORIGIN]);
  expect(useSearchResultsStore.getState().consumePendingSeedOrigins('wondercard-list')).toEqual([
    UI_ORIGIN,
  ]);
  expect(useSearchResultsStore.getState().consumePendingSeedOrigins('wondercard-list')).toEqual([]);
  expect(useTrainerStore.getState().tid).toBe(0);
  expect(useProfileStore.getState().profiles).toEqual(profiles);
  snapshot.settings.inputs.genConfig.max_advance = 999;
  expect(list.inputs.genConfig.max_advance).toBe(30);
});

it('通常配布の転記では現在の受取人入力を変更しない', () => {
  useTrainerStore.getState().setTrainer(111, 222);
  navigateToWonderCardListFromSearch(UI_ORIGIN, request(UI_CARD));
  expect(useTrainerStore.getState().tid).toBe(111);
});
