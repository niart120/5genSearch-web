import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import type { Category, FeatureId } from './navigation';

export const CATEGORY_LABELS: Record<Category, () => ReactElement> = {
  search: () => <Trans>Search</Trans>,
  generation: () => <Trans>Generation</Trans>,
  tools: () => <Trans>Tools</Trans>,
};

export const FEATURE_LABELS: Record<FeatureId, () => ReactElement> = {
  'datetime-search': () => <Trans>Datetime Search</Trans>,
  'egg-search': () => <Trans>Egg Search</Trans>,
  'generation-list': () => <Trans>Generation List</Trans>,
  'egg-generation': () => <Trans>Egg Generation</Trans>,
  'mtseed-search': () => <Trans>MT Seed Search</Trans>,
  'tid-adjust': () => <Trans>TID Adjust</Trans>,
  needle: () => <Trans>Needle</Trans>,
};
