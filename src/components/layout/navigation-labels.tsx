import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import type { Category, FeatureId } from '@/lib/navigation';

export const CATEGORY_LABELS: Record<Category, () => ReactElement> = {
  search: () => <Trans>Search</Trans>,
  generation: () => <Trans>Generation</Trans>,
  tools: () => <Trans>Tools</Trans>,
  about: () => <Trans>About</Trans>,
};

export const FEATURE_LABELS: Record<FeatureId, () => ReactElement> = {
  'datetime-search': () => <Trans>Pokemon</Trans>,
  'egg-search': () => <Trans>Egg</Trans>,
  'pokemon-list': () => <Trans>Pokemon</Trans>,
  'egg-list': () => <Trans>Egg</Trans>,
  'wondercard-list': () => <Trans>Deliveryman</Trans>,
  'wondercard-search': () => <Trans>Deliveryman</Trans>,
  'mtseed-search': () => <Trans>MT Seed Search</Trans>,
  'tid-adjust': () => <Trans>TID Adjust</Trans>,
  needle: () => <Trans>Needle</Trans>,
  about: () => <Trans>About</Trans>,
};
