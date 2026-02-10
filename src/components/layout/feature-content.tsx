import type { ReactElement } from 'react';
import { CATEGORIES } from '@/lib/navigation';
import { TabsContent } from '@/components/ui/tabs';
import { PlaceholderPage } from './placeholder-page';

function FeatureContent(): ReactElement {
  return (
    <>
      {CATEGORIES.flatMap((cat) =>
        cat.features.map((featureId) => (
          <TabsContent key={featureId} value={featureId} className="mt-0">
            <PlaceholderPage featureId={featureId} />
          </TabsContent>
        ))
      )}
    </>
  );
}

export { FeatureContent };
