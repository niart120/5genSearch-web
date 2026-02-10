import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { getCategoryDef } from '@/lib/navigation';
import type { Category, FeatureId } from '@/lib/navigation';
import { useUiStore } from '@/stores/settings/ui';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

const FEATURE_LABELS: Record<FeatureId, () => ReactElement> = {
  'datetime-search': () => <Trans>Datetime Search</Trans>,
  'egg-search': () => <Trans>Egg Search</Trans>,
  'generation-list': () => <Trans>Generation List</Trans>,
  'egg-generation': () => <Trans>Egg Generation</Trans>,
  'mtseed-search': () => <Trans>MT Seed Search</Trans>,
  'tid-adjust': () => <Trans>TID Adjust</Trans>,
  needle: () => <Trans>Needle</Trans>,
};

function FeatureTabs(): ReactElement | undefined {
  const activeCategory: Category = useUiStore((s) => s.activeCategory);
  const categoryDef = getCategoryDef(activeCategory);

  if (categoryDef.features.length <= 1) {
    return undefined;
  }

  return (
    <div className="shrink-0 border-b border-border px-4 py-1 lg:px-6">
      <TabsList className="h-8">
        {categoryDef.features.map((featureId) => {
          const Label = FEATURE_LABELS[featureId];
          return (
            <TabsTrigger key={featureId} value={featureId}>
              <Label />
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}

export { FeatureTabs };
