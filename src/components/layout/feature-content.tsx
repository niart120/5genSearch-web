import type { ReactElement } from 'react';
import { CATEGORIES, type FeatureId } from '@/lib/navigation';
import { TabsContent } from '@/components/ui/tabs';
import { PlaceholderPage } from './placeholder-page';
import { DatetimeSearchPage } from '@/features/datetime-search';
import { EggSearchPage } from '@/features/egg-search';
import { MtseedSearchPage } from '@/features/mtseed-search';
import { PokemonListPage } from '@/features/pokemon-list';
import { EggListPage } from '@/features/egg-list';
import { AboutPage } from '@/features/about';

function renderFeature(featureId: FeatureId) {
  switch (featureId) {
    case 'datetime-search': {
      return <DatetimeSearchPage />;
    }
    case 'egg-search': {
      return <EggSearchPage />;
    }
    case 'pokemon-list': {
      return <PokemonListPage />;
    }
    case 'egg-list': {
      return <EggListPage />;
    }
    case 'mtseed-search': {
      return <MtseedSearchPage />;
    }
    case 'about': {
      return <AboutPage />;
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
          <TabsContent
            key={featureId}
            value={featureId}
            className="mt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
          >
            {renderFeature(featureId)}
          </TabsContent>
        ))
      )}
    </>
  );
}

export { FeatureContent };
