import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import type { FeatureId } from '@/lib/navigation';
import { FEATURE_LABELS } from './navigation-labels';

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
