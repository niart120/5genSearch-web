import { Trans } from '@lingui/react/macro';

export function RangeError({ id, invalid }: { id: string; invalid: boolean }) {
  return invalid ? (
    <p id={id} role="alert" className="col-span-full text-xs text-destructive">
      <Trans>Min must be less than or equal to max</Trans>
    </p>
  ) : undefined;
}
