import { Trans, useLingui } from '@lingui/react/macro';
import { HelpTooltip } from './help-tooltip';

export function NpcTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About NPC advances`}>
      <Trans>
        Generates results accounting for RNG advances that occur when you speak to the Day-Care Man
        as quickly as possible after leaving the Day Care.
      </Trans>
    </HelpTooltip>
  );
}

export function AdvanceRangeTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About the advance range`}>
      <Trans>
        Sets the range of advances to search or generate. The startup offset is not included.
      </Trans>
    </HelpTooltip>
  );
}

export function AdvanceTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About advances`}>
      <Trans>The number of RNG advances excluding the startup offset.</Trans>
    </HelpTooltip>
  );
}

export function NeedleInputTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About needle input`}>
      <Trans>
        Enter the initial needle direction for each save in the order observed. Directions are
        numbered clockwise from 0 to 7, with 0 pointing up.
      </Trans>
    </HelpTooltip>
  );
}

export function NeedleTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About the needle`}>
      <Trans>The needle direction shown when saving at this advance.</Trans>
    </HelpTooltip>
  );
}

export function NeedleResultAdvanceTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About needle search advances`}>
      <Trans>The advance corresponding to the last needle in the entered sequence.</Trans>
    </HelpTooltip>
  );
}
