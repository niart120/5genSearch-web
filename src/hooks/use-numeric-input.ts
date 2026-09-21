import { useState } from 'react';
import { clampOrDefault } from '@/components/forms/input-helpers';

/** 下書きは編集中だけ持ち、確定後の表示は必ず親の値に戻す。 */
export function useNumericInput(
  value: number,
  options: { defaultValue: number; min: number; max: number },
  syncKey?: number | boolean
) {
  const [draft, setDraft] = useState<{
    source: number;
    syncKey?: number | boolean;
    text: string;
  }>();
  if (draft && (draft.source !== value || draft.syncKey !== syncKey)) setDraft(undefined);
  return {
    text: draft?.text ?? String(value),
    setText: (text: string) => setDraft({ source: value, syncKey, text }),
    commit: () => {
      const next = clampOrDefault(draft?.text ?? String(value), options);
      setDraft(undefined);
      return next;
    },
  };
}
