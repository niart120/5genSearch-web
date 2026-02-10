/** 第 1 層: カテゴリ */
export type Category = 'search' | 'generation' | 'tools';

/** 第 2 層: 機能 ID */
export type FeatureId =
  | 'datetime-search'
  | 'egg-search'
  | 'generation-list'
  | 'egg-generation'
  | 'mtseed-search'
  | 'tid-adjust'
  | 'needle';

export interface CategoryDef {
  readonly id: Category;
  readonly features: readonly FeatureId[];
  readonly defaultFeature: FeatureId;
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'search',
    features: ['datetime-search', 'egg-search'],
    defaultFeature: 'datetime-search',
  },
  {
    id: 'generation',
    features: ['generation-list', 'egg-generation'],
    defaultFeature: 'generation-list',
  },
  {
    id: 'tools',
    features: ['mtseed-search', 'tid-adjust', 'needle'],
    defaultFeature: 'mtseed-search',
  },
] as const;

/** Category ID → CategoryDef */
export function getCategoryDef(id: Category): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}

/** FeatureId → 所属 Category */
export function getCategoryByFeature(featureId: FeatureId): Category {
  const cat = CATEGORIES.find((c) => c.features.includes(featureId));
  if (!cat) throw new Error(`Unknown feature: ${featureId}`);
  return cat.id;
}

/** Category のデフォルト Feature を取得 */
export function getDefaultFeature(category: Category): FeatureId {
  return getCategoryDef(category).defaultFeature;
}
