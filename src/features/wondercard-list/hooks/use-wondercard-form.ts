import { getWonderCardAppliedFilter } from '../request';
import { useLingui } from '@lingui/react/macro';
import { useWonderCardSelection } from './use-wondercard-selection';
import {
  validateWonderCardForm,
  type WonderCardFormState,
  type WonderCardSelection,
  type WonderCardValidationCode,
} from '../types';
import { get_species_gender_ratio } from '@/wasm/wasm_pkg.js';

export function useWonderCardForm(
  inputs: WonderCardFormState,
  stored: WonderCardSelection | undefined,
  setSelection: (selection: WonderCardSelection | undefined) => void
) {
  const { t } = useLingui();
  const selection = useWonderCardSelection(inputs.cardId, stored, setSelection);
  const context = selection.card
    ? { card: selection.card, genderRatio: get_species_gender_ratio(selection.card.speciesId) }
    : undefined;
  const filter = selection.card ? getWonderCardAppliedFilter(inputs, selection.card) : undefined;
  const codes = validateWonderCardForm(inputs, filter);
  const messages: Record<WonderCardValidationCode, string | undefined> = {
    ADVANCE_RANGE_INVALID: undefined,
    OFFSET_NEGATIVE: undefined,
    IV_RANGE_INVALID: undefined,
    FILTER_INVALID: t`Enter valid filter values`,
  };
  const errors = codes.flatMap((code) => messages[code] ?? []);
  if (!inputs.cardId) errors.push(t`Select a Wonder Card`);
  if (selection.card?.kind === 'egg' && !selection.selection)
    errors.push(t`Enter recipient TID and SID as integers from 0 to 65535`);
  return {
    selection,
    context,
    errors,
    isValid:
      codes.length === 0 &&
      errors.length === 0 &&
      !!selection.selection &&
      !selection.loading &&
      !selection.error,
  };
}
