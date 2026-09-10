import type { WonderCardEntry, WonderCardLanguage } from '@/data/wondercards/schema';
import { getWonderCardLanguage } from '@/data/wondercards/loader';
import { toWonderCardParams } from '@/data/wondercards/converter';
import { normalizeWonderCardFilter, type WonderCardFilterInput } from '@/lib/search-filter-context';
import { IV_STAT_KEYS, type StatDisplayMode } from '@/lib/game-data-names';
import { validateGenConfig } from '@/lib/validation';
import { get_species_gender_ratio } from '@/wasm/wasm_pkg.js';
import type {
  CoreDataFilter,
  DsConfig,
  GameStartConfig,
  GenerationConfig,
  SeedOrigin,
  StatsFilter,
  Timer0VCountRange,
  TrainerInfo,
  WonderCardParams,
} from '@/wasm/wasm_pkg.js';

export interface WonderCardFormState {
  cardId: string;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: WonderCardFilterInput | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
}

export function getWonderCardInitialFormState(): WonderCardFormState {
  return {
    cardId: '',
    genConfig: { user_offset: 0, max_advance: 30 },
    filter: undefined,
    statsFilter: undefined,
    statMode: 'stats',
  };
}

export interface WonderCardSelection {
  card: WonderCardEntry;
  params: WonderCardParams;
  language: WonderCardLanguage;
  version: DsConfig['version'];
}

type Recipient = { tid: number | undefined; sid: number | undefined };
export function isValidRecipient(recipient: Recipient): recipient is TrainerInfo {
  return [recipient.tid, recipient.sid].every(
    (v) => v !== undefined && Number.isInteger(v) && v >= 0 && v <= 65_535
  );
}

export function matchesWonderCardSelection(
  selection: WonderCardSelection | undefined,
  cardId: string,
  ds: DsConfig,
  recipient: Recipient
): selection is WonderCardSelection {
  return (
    !!selection &&
    selection.card.id === cardId &&
    selection.language === getWonderCardLanguage(ds.region) &&
    selection.version === ds.version &&
    selection.card.versions.includes(ds.version) &&
    (selection.card.kind === 'pokemon' ||
      (selection.params.trainer.tid === recipient.tid &&
        selection.params.trainer.sid === recipient.sid))
  );
}

export function resolveWonderCardSelection(
  card: WonderCardEntry,
  ds: DsConfig,
  recipient: Recipient
): WonderCardSelection | undefined {
  if (card.language !== getWonderCardLanguage(ds.region) || !card.versions.includes(ds.version))
    return;
  if (card.kind === 'egg' && !isValidRecipient(recipient)) return;
  return {
    card,
    params: toWonderCardParams(card, isValidRecipient(recipient) ? recipient : undefined),
    language: card.language,
    version: ds.version,
  };
}

export interface WonderCardRunSettings {
  card: WonderCardEntry;
  params: WonderCardParams;
  genConfig: GenerationConfig;
  filter: CoreDataFilter | undefined;
  inputs: WonderCardFormState;
  ds: DsConfig;
  ranges: Timer0VCountRange[];
  timer0Auto: boolean;
}

export interface WonderCardListRequest {
  settings: WonderCardRunSettings;
  origins: SeedOrigin[];
}

export type WonderCardValidationCode =
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'FILTER_INVALID';

export function validateWonderCardForm(
  form: WonderCardFormState,
  filter: CoreDataFilter | undefined
): WonderCardValidationCode[] {
  const errors: WonderCardValidationCode[] = validateGenConfig(form.genConfig);
  const { user_offset, max_advance } = form.genConfig;
  if (
    !Number.isInteger(user_offset) ||
    !Number.isInteger(max_advance) ||
    max_advance >= 0xff_ff_ff_ff
  )
    errors.push('ADVANCE_RANGE_INVALID');
  const iv = filter?.iv;
  if (
    (iv &&
      IV_STAT_KEYS.some((key) => {
        const [min, max] = iv[key];
        return !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min > max || max > 31;
      })) ||
    (iv?.hidden_power_min_power !== undefined &&
      (!Number.isInteger(iv.hidden_power_min_power) ||
        iv.hidden_power_min_power < 30 ||
        iv.hidden_power_min_power > 70)) ||
    (filter?.stats &&
      Object.values(filter.stats).some(
        (v) => v !== undefined && (!Number.isInteger(v) || v < 0 || v > 65_535)
      ))
  )
    errors.push('FILTER_INVALID');
  return [...new Set(errors)];
}

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
