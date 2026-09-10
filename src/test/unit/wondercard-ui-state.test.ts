import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/wasm/wasm_pkg.js', () => ({ get_species_gender_ratio: () => 'F1M1' }));
import {
  buildWonderCardRunSettings,
  getWonderCardInitialFormState,
  isValidRecipient,
  resolveWonderCardSelection,
  validateWonderCardForm,
} from '@/features/wondercard-list/types';
import {
  getWonderCardListInitialState,
  useWonderCardListStore,
} from '@/features/wondercard-list/store';
import {
  getWonderCardSearchInitialState,
  useWonderCardSearchStore,
} from '@/features/wondercard-search/store';
import {
  getWonderCardSearchContext,
  validateWonderCardSearchRange,
} from '@/features/wondercard-search/types';
import { getDsConfigInitialState } from '@/stores/settings/ds-config';
import {
  getWonderCardFilterVisibility,
  normalizeWonderCardFilter,
  DEFAULT_IV_RANGES,
} from '@/lib/search-filter-context';
import {
  estimateWonderCardListResults,
  estimateWonderCardDatetimeSearchResults,
} from '@/services/search-estimation';
import { parseSerializedSeedOrigins, serializeSeedOrigin } from '@/services/seed-origin-serde';
import { EMPTY_CORE_FILTER, UI_CARD, UI_EGG_CARD, UI_ORIGIN } from '../fixtures/wondercards/ui';

const ds = () => structuredClone(getDsConfigInitialState());
const recipient = { tid: 0, sid: 65_535 };
function settings(card = UI_CARD) {
  const inputs = { ...getWonderCardInitialFormState(), cardId: card.id };
  const selection = resolveWonderCardSelection(card, ds().config, recipient);
  return buildWonderCardRunSettings(inputs, selection, ds(), recipient)!;
}

describe('配達員の実行要求と入力保持', () => {
  beforeEach(() => {
    localStorage.clear();
    useWonderCardListStore.setState(getWonderCardListInitialState());
    useWonderCardSearchStore.setState(getWonderCardSearchInitialState());
  });
  it('通常配布はカード内 ID、タマゴは受取人の 0 と 65535 を使う', () => {
    expect([settings().params.trainer, settings(UI_EGG_CARD).params.trainer]).toEqual([
      UI_CARD.trainer,
      recipient,
    ]);
  });
  it.each([undefined, -1, 65_536, 0.5, Number.NaN])('受取人の不正値 %s を拒否する', (tid) => {
    expect(isValidRecipient({ tid, sid: 0 })).toBe(false);
  });
  it('旧 ROM・旧カード・旧受取人の解決済み条件は要求にしない', () => {
    const inputs = { ...getWonderCardInitialFormState(), cardId: UI_EGG_CARD.id };
    const selection = resolveWonderCardSelection(UI_EGG_CARD, ds().config, recipient);
    expect([
      buildWonderCardRunSettings(
        inputs,
        selection,
        { ...ds(), config: { ...ds().config, version: 'White' } },
        recipient
      ),
      buildWonderCardRunSettings({ ...inputs, cardId: 'missing' }, selection, ds(), recipient),
      buildWonderCardRunSettings(inputs, selection, ds(), { tid: 1, sid: 0 }),
    ]).toEqual([undefined, undefined, undefined]);
  });
  it('カード・入力・DS 設定の編集が実行要求へ波及しない', () => {
    const card = structuredClone(UI_CARD);
    const inputs = { ...getWonderCardInitialFormState(), cardId: card.id };
    const currentDs = ds();
    const request = buildWonderCardRunSettings(
      inputs,
      resolveWonderCardSelection(card, currentDs.config, recipient),
      currentDs,
      recipient
    )!;
    card.level = 1;
    inputs.genConfig.max_advance = 999;
    currentDs.config.version = 'White2';
    expect([request.card.level, request.genConfig.max_advance, request.ds.version]).toEqual([
      50,
      30,
      'Black',
    ]);
  });
  it.each([useWonderCardListStore, useWonderCardSearchStore])(
    '入力だけを保存し、resetForm は結果と要求を保持する',
    (store) => {
      const request = {
        settings: settings(),
        origins: [UI_ORIGIN],
        ...getWonderCardSearchInitialState(),
      };
      store.getState().startResults(request);
      store.getState().setInputs({ cardId: UI_CARD.id, statMode: 'ivs' });
      const saved = JSON.parse(localStorage.getItem(store.persist.getOptions().name!)!);
      expect(Object.keys(saved.state)).not.toContain('resultRequest');
      expect(saved.state.inputs.cardId).toBe(UI_CARD.id);
      store.getState().resetForm();
      expect(store.getState().resultRequest).toEqual(request);
      expect(store.getState().inputs.cardId).toBe('');
    }
  );
  it('Startup のインポート入力を永続化・復元する', async () => {
    const importText = JSON.stringify([serializeSeedOrigin(UI_ORIGIN)]);
    useWonderCardListStore.getState().setSeedInput((s) => ({ ...s, importText }));
    useWonderCardListStore.getState().setSeedInputMode('import');
    await useWonderCardListStore.persist.rehydrate();
    expect(
      parseSerializedSeedOrigins(useWonderCardListStore.getState().seedInput.importText)
    ).toEqual([UI_ORIGIN]);
  });
  it('整数でない消費範囲と上限 overflow を拒否する', () => {
    for (const max_advance of [0.5, Number.NaN, 0xff_ff_ff_ff]) {
      expect(
        validateWonderCardForm(
          { ...getWonderCardInitialFormState(), genConfig: { user_offset: 0, max_advance } },
          EMPTY_CORE_FILTER
        )
      ).toContain('ADVANCE_RANGE_INVALID');
    }
  });
});

describe('配達員 Filter と件数上限', () => {
  const context = { card: UI_CARD, genderRatio: 'F1M1' as const };
  it('固定項目を無効にしても元の編集値を保持し、可変カードへ戻すと適用する', () => {
    const input = {
      ...EMPTY_CORE_FILTER,
      natures: ['Hardy' as const],
      gender: 'Female' as const,
      ability_slot: 'Hidden' as const,
      shiny: 'Shiny' as const,
    };
    const fixed = {
      ...context,
      card: {
        ...UI_CARD,
        fixedNature: 'Hardy' as const,
        fixedGender: 'Male' as const,
        fixedAbilitySlot: 'First' as const,
        shinyPolicy: 'Always' as const,
      },
    };
    expect(normalizeWonderCardFilter(input, undefined, fixed, 'ivs')).toBeUndefined();
    expect(normalizeWonderCardFilter(input, undefined, context, 'ivs')).toEqual(input);
  });
  it.each(['Genderless', 'MaleOnly', 'FemaleOnly'] as const)(
    '%s の性別を非表示にする',
    (genderRatio) => {
      expect(getWonderCardFilterVisibility({ ...context, genderRatio }).gender).toBe(false);
    }
  );
  it('IV の無効範囲と未指定条件を除外し、実数値とモードで切り替える', () => {
    const iv = {
      ...DEFAULT_IV_RANGES,
      hp: [20, 10] as [number, number],
      enabledStats: { hp: false },
    };
    const input = { ...EMPTY_CORE_FILTER, iv, natures: [] };
    const stats = {
      hp: 100,
      atk: undefined,
      def: undefined,
      spa: undefined,
      spd: undefined,
      spe: undefined,
    };
    expect(normalizeWonderCardFilter(input, stats, context, 'ivs')).toBeUndefined();
    expect(normalizeWonderCardFilter(input, stats, context, 'stats')?.stats).toEqual(stats);
    expect(
      normalizeWonderCardFilter({ ...input, enabled: false }, stats, context, 'stats')
    ).toBeUndefined();
  });
  it('上限を含む候補数を、固定カードでも確認用件数に使う', () => {
    expect(
      estimateWonderCardListResults(2, { user_offset: 10, max_advance: 10 }).estimatedCount
    ).toBe(2);
    expect(
      estimateWonderCardListResults(1, { user_offset: 0, max_advance: 50_000 }).exceedsThreshold
    ).toBe(true);
    const request = {
      settings: settings(),
      ...getWonderCardSearchInitialState(),
      dateRange: {
        start_year: 2010,
        start_month: 9,
        start_day: 18,
        end_year: 2010,
        end_month: 9,
        end_day: 18,
      },
      timeRange: {
        hour_start: 0,
        hour_end: 0,
        minute_start: 0,
        minute_end: 0,
        second_start: 0,
        second_end: 1,
      },
    };
    expect(
      estimateWonderCardDatetimeSearchResults(
        getWonderCardSearchContext(request),
        request.settings.genConfig
      ).estimatedCount
    ).toBe(124);
    expect(validateWonderCardSearchRange(request, request.settings.ranges)).toEqual([]);
    expect(
      validateWonderCardSearchRange(
        { ...request, dateRange: { ...request.dateRange, start_day: 32 } },
        []
      )
    ).toEqual(['DATE_RANGE_INVALID', 'STARTUP_RANGE_INVALID']);
  });
});
