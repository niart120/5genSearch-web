import type { ReactElement } from 'react';
import { getCategoryDef } from '@/lib/navigation';
import type { Category } from '@/lib/navigation';
import { FEATURE_LABELS } from '@/lib/navigation-labels';
import { useUiStore } from '@/stores/settings/ui';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

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
