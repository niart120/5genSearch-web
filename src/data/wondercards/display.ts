import { get_species_name } from '@/wasm/wasm_pkg.js';
import type { SupportedLocale } from '@/i18n';
import type { WonderCardEntry } from './schema';

export interface WonderCardDisplay {
  id: string;
  label: string;
  /** 基本表示が重複する通常配布の TID。 */
  trainerLabel?: string;
  /** TID でも区別できない候補、または重複したタマゴの内部 ID。 */
  disambiguationId?: string;
}

/** 選択候補内でだけ重複を判定する。カードや受取人の状態は変更しない。 */
export function getWonderCardDisplays(
  cards: readonly WonderCardEntry[],
  locale: SupportedLocale
): WonderCardDisplay[] {
  const labels = cards.map(
    (card) => `${get_species_name(card.speciesId, locale)}（${card.cardTitle}）`
  );
  const labelCounts = new Map<string, number>();
  const trainerCounts = new Map<string, Map<number, number>>();
  for (const [index, card] of cards.entries()) {
    const label = labels[index];
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    if (card.kind === 'pokemon') {
      const tids = trainerCounts.get(label) ?? new Map<number, number>();
      tids.set(card.trainer.tid, (tids.get(card.trainer.tid) ?? 0) + 1);
      trainerCounts.set(label, tids);
    }
  }
  return cards.map((card, index) => {
    const label = labels[index];
    if (labelCounts.get(label) === 1) return { id: card.id, label };
    if (card.kind === 'egg') return { id: card.id, label, disambiguationId: card.id };
    return {
      id: card.id,
      label,
      trainerLabel: `TID: ${card.trainer.tid.toString().padStart(5, '0')}`,
      ...((trainerCounts.get(label)?.get(card.trainer.tid) ?? 0) > 1 && {
        disambiguationId: card.id,
      }),
    };
  });
}
