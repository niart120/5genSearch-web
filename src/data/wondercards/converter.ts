import type { TrainerInfo, WonderCardParams } from '@/wasm/wasm_pkg.js';
import type { WonderCardEntry } from './schema';

/** 通常配布は配布元、配布タマゴは受取人の ID を使う。 */
export function toWonderCardParams(
  card: WonderCardEntry,
  recipient?: TrainerInfo
): WonderCardParams {
  const trainer = card.kind === 'pokemon' ? card.trainer : recipient;
  if (trainer?.tid === undefined || trainer.sid === undefined) {
    throw new Error('Recipient TID and SID are required');
  }
  const ivs = card.fixedIvs;
  const fixedIvs: WonderCardParams['fixed_ivs'] = [
    ivs.hp,
    ivs.atk,
    ivs.def,
    ivs.spa,
    ivs.spd,
    ivs.spe,
  ];
  return {
    trainer: { ...trainer },
    species_id: card.speciesId,
    level: card.level,
    fixed_ivs: fixedIvs,
    fixed_nature: card.fixedNature,
    fixed_gender: card.fixedGender,
    fixed_ability_slot: card.fixedAbilitySlot,
    shiny_policy: card.shinyPolicy,
  };
}
