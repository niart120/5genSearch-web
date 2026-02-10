import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import type { FeatureId } from '@/lib/navigation';

const FEATURE_LABELS: Record<FeatureId, () => ReactElement> = {
  'datetime-search': () => <Trans>Datetime Search</Trans>,
  'egg-search': () => <Trans>Egg Search</Trans>,
  'generation-list': () => <Trans>Generation List</Trans>,
  'egg-generation': () => <Trans>Egg Generation</Trans>,
  'mtseed-search': () => <Trans>MT Seed Search</Trans>,
  'tid-adjust': () => <Trans>TID Adjust</Trans>,
  needle: () => <Trans>Needle</Trans>,
};

interface PlaceholderPageProps {
  featureId: FeatureId;
}

function PlaceholderPage({ featureId }: PlaceholderPageProps): ReactElement {
  const Label = FEATURE_LABELS[featureId];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md space-y-4 px-6 text-center">
        <h2 className="text-lg font-semibold">
          <Label />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>This feature is under development.</Trans>
        </p>
      </div>
    </div>
  );
}

export { PlaceholderPage };
export type { PlaceholderPageProps };
