import type { ReactElement } from 'react';
import { CATEGORIES, type FeatureId } from '@/lib/navigation';
import { TabsContent } from '@/components/ui/tabs';
import { PlaceholderPage } from './placeholder-page';
import { DatetimeSearchPage } from '@/features/datetime-search';

function renderFeature(featureId: FeatureId) {
  switch (featureId) {
    case 'datetime-search': {
      return <DatetimeSearchPage />;
    }
    default: {
      return <PlaceholderPage featureId={featureId} />;
    }
  }
}

function FeatureContent(): ReactElement {
  return (
    <>
      {CATEGORIES.flatMap((cat) =>
        cat.features.map((featureId) => (
          <TabsContent key={featureId} value={featureId} className="mt-0">
            {renderFeature(featureId)}
          </TabsContent>
        ))
      )}
    </>
  );
}

export { FeatureContent };
