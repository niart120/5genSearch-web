import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { CATEGORIES, type FeatureId } from '@/lib/navigation';
import { TabsContent } from '@/components/ui/tabs';
import { PlaceholderPage } from './placeholder-page';
import { DatetimeSearchPage } from '@/features/datetime-search';
import { EggSearchPage } from '@/features/egg-search';
import { MtseedSearchPage } from '@/features/mtseed-search';
import { TidAdjustPage } from '@/features/tid-adjust';
import { PokemonListPage } from '@/features/pokemon-list';
import { EggListPage } from '@/features/egg-list';
import { AboutPage } from '@/features/about';
import { NeedlePage } from '@/features/needle';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import type { RomVersion } from '@/wasm/wasm_pkg';

const EGG_FEATURE_IDS = new Set<FeatureId>(['egg-search', 'egg-list']);

function isBw2(version: RomVersion): boolean {
  return version === 'Black2' || version === 'White2';
}

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
    case 'tid-adjust': {
      return <TidAdjustPage />;
    }
    case 'needle': {
      return <NeedlePage />;
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
  const version = useDsConfigStore((s) => s.config.version);
  const bw2 = isBw2(version);

  return (
    <>
      {CATEGORIES.flatMap((cat) =>
        cat.features.map((featureId) => (
          <TabsContent
            key={featureId}
            value={featureId}
            className="mt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
          >
            {bw2 && EGG_FEATURE_IDS.has(featureId) ? (
              <PlaceholderPage
                featureId={featureId}
                message={<Trans>This feature is only available in BW (Black/White).</Trans>}
              />
            ) : (
              renderFeature(featureId)
            )}
          </TabsContent>
        ))
      )}
    </>
  );
}

export { FeatureContent };
