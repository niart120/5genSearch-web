import { get_species_gender_ratio } from '@/wasm/wasm_pkg.js';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '@/wasm/wasm_pkg.js';
import type { WonderCardEntry } from '@/data/wondercards/schema';
import { normalizeWonderCardFilter } from '@/lib/search-filter-context';
import {
  matchesWonderCardSelection,
  validateWonderCardForm,
  type WonderCardFormState,
  type WonderCardSelection,
  type WonderCardRunSettings,
} from './types';

type Recipient = { tid: number | undefined; sid: number | undefined };

export function getWonderCardAppliedFilter(form: WonderCardFormState, card: WonderCardEntry) {
  return normalizeWonderCardFilter(
    form.filter,
    form.statsFilter,
    { card, genderRatio: get_species_gender_ratio(card.speciesId) },
    form.statMode
  );
}

/** 値フィールドだけを複製し、確認・実行・転記で同じ条件を使う。 */
export function buildWonderCardRunSettings(
  inputs: WonderCardFormState,
  selection: WonderCardSelection | undefined,
  ds: {
    config: DsConfig;
    ranges: Timer0VCountRange[];
    timer0Auto: boolean;
    gameStart: GameStartConfig;
  },
  recipient: Recipient
): WonderCardRunSettings | undefined {
  if (!matchesWonderCardSelection(selection, inputs.cardId, ds.config, recipient)) return;
  const filter = getWonderCardAppliedFilter(inputs, selection.card);
  if (validateWonderCardForm(inputs, filter).length > 0) return;
  return structuredClone({
    card: selection.card,
    params: selection.params,
    genConfig: { ...inputs.genConfig, version: ds.config.version, game_start: ds.gameStart },
    filter,
    inputs,
    ds: ds.config,
    ranges: ds.ranges,
    timer0Auto: ds.timer0Auto,
  });
}
