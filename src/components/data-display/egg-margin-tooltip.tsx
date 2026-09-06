import { Trans, useLingui } from '@lingui/react/macro';
import { HelpTooltip } from './help-tooltip';

export function EggMarginTooltip() {
  const { t } = useLingui();
  return (
    <HelpTooltip label={t`About margin frames`}>
      <Trans>
        The number of frames you can delay and still receive the same Egg, measured from the
        earliest possible moment you can speak to the Day-Care Man after leaving the Day Care.
      </Trans>
    </HelpTooltip>
  );
}
