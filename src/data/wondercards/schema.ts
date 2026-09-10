import type {
  AbilitySlot,
  Gender,
  Nature,
  RomVersion,
  TrainerInfo,
  WonderCardShinyPolicy,
} from '@/wasm/wasm_pkg.js';

export type FixedIvsJson = Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>;

interface WonderCardCommon {
  id: string;
  displayName: { ja: string; en: string };
  versions: RomVersion[];
  speciesId: number;
  level: number;
  fixedIvs: FixedIvsJson;
  fixedNature?: Nature;
  fixedGender?: Exclude<Gender, 'Genderless'>;
  fixedAbilitySlot?: AbilitySlot;
  shinyPolicy: WonderCardShinyPolicy;
}

/** 読み込み後のカード。未指定は undefined に統一する。 */
export type WonderCardEntry = WonderCardCommon &
  ({ kind: 'pokemon'; trainer: TrainerInfo } | { kind: 'egg'; trainer?: never });

/** JSON 境界だけで null を受け付ける。 */
export type WonderCardEntryJson = Omit<
  WonderCardCommon,
  'fixedIvs' | 'fixedNature' | 'fixedGender' | 'fixedAbilitySlot'
> & {
  fixedIvs: Partial<Record<keyof FixedIvsJson, number | null>>;
  fixedNature?: Nature | null;
  fixedGender?: Exclude<Gender, 'Genderless'> | null;
  fixedAbilitySlot?: AbilitySlot | null;
} & ({ kind: 'pokemon'; trainer: TrainerInfo } | { kind: 'egg'; trainer?: never });

export interface WonderCardCatalogJson {
  source: { name: string; url: string; retrievedAt: string };
  entries: WonderCardEntryJson[];
}
