import { useEffect, useMemo, useState } from 'react';
import { getWonderCardLanguage, loadWonderCards } from '@/data/wondercards/loader';
import type { WonderCardEntry } from '@/data/wondercards/schema';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import {
  matchesWonderCardSelection,
  resolveWonderCardSelection,
  type WonderCardSelection,
} from '../types';

const EMPTY_CARDS: WonderCardEntry[] = [];

export function useWonderCardSelection(
  cardId: string,
  stored: WonderCardSelection | undefined,
  setSelection: (selection: WonderCardSelection | undefined) => void,
  clearUnavailableCard: (expectedCardId: string) => void
) {
  const ds = useDsConfigStore((s) => s.config);
  const tid = useTrainerStore((s) => s.tid);
  const sid = useTrainerStore((s) => s.sid);
  const language = getWonderCardLanguage(ds.region);
  const version = ds.version;
  const key = `${language}:${version}`;
  const [catalog, setCatalog] = useState<{
    key: string;
    cards: WonderCardEntry[];
    error?: Error;
  }>();

  useEffect(() => {
    let current = true;
    loadWonderCards(language, version).then(
      (cards) => {
        if (current) setCatalog({ key, cards });
      },
      (error: Error) => {
        if (current) setCatalog({ key, cards: [], error });
      }
    );
    return () => {
      current = false;
    };
  }, [language, version, key]);

  const cards = catalog?.key === key ? catalog.cards : EMPTY_CARDS;
  // 転記された定義は、受取人だけの編集でも保持して変換し直す。
  const storedCard =
    stored?.card.id === cardId && stored.language === language && stored.version === version
      ? stored.card
      : undefined;
  const ready = catalog?.key === key && !catalog.error;
  const catalogCard = ready ? cards.find((entry) => entry.id === cardId) : undefined;
  const card = catalogCard ? (storedCard ?? catalogCard) : undefined;
  const selection = useMemo(() => {
    if (!card) return;
    if (matchesWonderCardSelection(stored, cardId, ds, { tid, sid })) return stored;
    return resolveWonderCardSelection(card, ds, { tid, sid });
  }, [stored, cardId, ds, tid, sid, card]);

  useEffect(() => {
    if (ready && cardId && !card) clearUnavailableCard(cardId);
    else if (selection && stored !== selection) setSelection(selection);
  }, [ready, cardId, card, stored, selection, setSelection, clearUnavailableCard]);

  return {
    cards,
    card,
    selection,
    loading: catalog?.key !== key,
    error: catalog?.key === key ? catalog.error : undefined,
  };
}
