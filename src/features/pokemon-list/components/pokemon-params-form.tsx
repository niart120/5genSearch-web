/**
 * エンカウント / 生成パラメータ入力フォーム
 *
 * EncounterType → Location or Static Pokemon → EncounterMethod 選択 → advance 範囲設定。
 */

import { useState, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clampOrDefault, handleFocusSelectAll } from '@/components/forms/input-helpers';
import { getEncounterLocationName, getNatureName, NATURE_ORDER } from '@/lib/game-data-names';
import { initMainThreadWasm } from '@/services/wasm-init';
import { useUiStore } from '@/stores/settings/ui';
import {
  isLocationBasedEncounter,
  listLocations,
  listSpecies,
  type EncounterSpeciesOption,
  type LocationOption,
} from '@/data/encounters/helpers';
import {
  toEncounterSlotConfigs,
  toEncounterSlotConfigFromEntry,
} from '@/data/encounters/converter';
import { getEncounterSlots, getStaticEncounterEntry } from '@/data/encounters/loader';
import type {
  EncounterMethodKey,
  StaticEncounterTypeKey,
  GameVersion,
} from '@/data/encounters/schema';
import type {
  EncounterType,
  EncounterMethod,
  EncounterSlotConfig,
  GenerationConfig,
  LeadAbilityEffect,
  Nature,
  RomVersion,
} from '@/wasm/wasm_pkg.js';
import type { SupportedLocale } from '@/i18n';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** エンカウントタイプのカテゴリ定義 */
interface EncounterCategory {
  labelKey: string;
  labels: Record<SupportedLocale, string>;
  types: (EncounterMethodKey | StaticEncounterTypeKey)[];
}

const ENCOUNTER_CATEGORIES: EncounterCategory[] = [
  {
    labelKey: 'wild',
    labels: { ja: '野生', en: 'Wild' },
    types: [
      'Normal',
      'ShakingGrass',
      'DustCloud',
      'PokemonShadow',
      'Surfing',
      'SurfingBubble',
      'Fishing',
      'FishingBubble',
    ],
  },
  {
    labelKey: 'legendary',
    labels: { ja: '伝説・準伝説', en: 'Legendary / Mythical' },
    types: ['StaticSymbol', 'StaticEvent'],
  },
  {
    labelKey: 'roamer',
    labels: { ja: '徘徊', en: 'Roamer' },
    types: ['Roamer'],
  },
  {
    labelKey: 'starter',
    labels: { ja: '御三家', en: 'Starter' },
    types: ['StaticStarter'],
  },
  {
    labelKey: 'fossil',
    labels: { ja: '化石', en: 'Fossil' },
    types: ['StaticFossil'],
  },
  {
    labelKey: 'hidden-grotto',
    labels: { ja: 'かくしあな', en: 'Hidden Grotto' },
    types: ['HiddenGrotto'],
  },
];

/** EncounterType の表示名を取得 */
const ENCOUNTER_TYPE_LABELS: Record<string, Record<SupportedLocale, string>> = {
  Normal: { ja: '草むら・洞窟', en: 'Grass / Cave' },
  ShakingGrass: { ja: '揺れる草むら', en: 'Shaking Grass' },
  DustCloud: { ja: '土煙', en: 'Dust Cloud' },
  PokemonShadow: { ja: 'ポケモンの影', en: 'Pokémon Shadow' },
  Surfing: { ja: 'なみのり', en: 'Surf' },
  SurfingBubble: { ja: 'なみのり(泡)', en: 'Rippling Surf' },
  Fishing: { ja: 'つり', en: 'Fishing' },
  FishingBubble: { ja: 'つり(泡)', en: 'Rippling Fishing' },
  StaticSymbol: { ja: 'シンボル', en: 'Symbol' },
  StaticStarter: { ja: '御三家', en: 'Starter' },
  StaticFossil: { ja: '化石', en: 'Fossil' },
  StaticEvent: { ja: 'イベント', en: 'Event' },
  Roamer: { ja: '徘徊', en: 'Roamer' },
  HiddenGrotto: { ja: 'かくしあな', en: 'Hidden Grotto' },
};

function getEncounterTypeLabel(type: string, locale: SupportedLocale): string {
  return ENCOUNTER_TYPE_LABELS[type]?.[locale] ?? type;
}

/** 指定された EncounterType が所属するカテゴリの labelKey を返す */
function findCategoryForType(type: string): string | undefined {
  for (const cat of ENCOUNTER_CATEGORIES) {
    if (cat.types.includes(type as EncounterMethodKey | StaticEncounterTypeKey)) {
      return cat.labelKey;
    }
  }
  return undefined;
}

/** RomVersion → GameVersion 変換 */
function toGameVersion(version: RomVersion): GameVersion {
  const map: Record<RomVersion, GameVersion> = {
    Black: 'B',
    White: 'W',
    Black2: 'B2',
    White2: 'W2',
  };
  return map[version];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PokemonParamsFormProps {
  encounterType: EncounterType;
  encounterMethod: EncounterMethod;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  leadAbility: LeadAbilityEffect;
  version: RomVersion;
  onEncounterTypeChange: (type: EncounterType) => void;
  onEncounterMethodChange: (method: EncounterMethod) => void;
  onGenConfigChange: (config: Pick<GenerationConfig, 'user_offset' | 'max_advance'>) => void;
  onLeadAbilityChange: (effect: LeadAbilityEffect) => void;
  onSlotsChange: (slots: EncounterSlotConfig[]) => void;
  onAvailableSpeciesChange: (species: EncounterSpeciesOption[]) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonParamsForm({
  encounterType,
  encounterMethod,
  genConfig,
  leadAbility,
  version,
  onEncounterTypeChange,
  onEncounterMethodChange,
  onGenConfigChange,
  onLeadAbilityChange,
  onSlotsChange,
  onAvailableSpeciesChange,
  disabled,
}: PokemonParamsFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const gameVersion = toGameVersion(version);

  // カテゴリ / サブタイプ選択状態
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => findCategoryForType(encounterType) ?? 'wild'
  );

  // ロケーション / 固定ポケモン選択状態
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStaticEntry, setSelectedStaticEntry] = useState<string>('');

  // 選択カテゴリのサブタイプ一覧
  const categorySubTypes = useMemo(() => {
    const cat = ENCOUNTER_CATEGORIES.find((c) => c.labelKey === selectedCategory);
    return cat?.types ?? [];
  }, [selectedCategory]);

  const isLocationBased = isLocationBasedEncounter(
    encounterType as EncounterMethodKey | StaticEncounterTypeKey
  );

  // ロケーション一覧
  const locations = useMemo<LocationOption[]>(() => {
    if (!isLocationBased) return [];
    return listLocations(gameVersion, encounterType as EncounterMethodKey);
  }, [gameVersion, encounterType, isLocationBased]);

  // 種族一覧
  const speciesOptions = useMemo<EncounterSpeciesOption[]>(() => {
    if (isLocationBased) {
      if (!selectedLocation) return [];
      return listSpecies(gameVersion, encounterType as EncounterMethodKey, selectedLocation);
    }
    return listSpecies(gameVersion, encounterType as StaticEncounterTypeKey);
  }, [gameVersion, encounterType, isLocationBased, selectedLocation]);

  // 固定エンカウントの種族名解決 (WASM 経由)
  const [speciesNames, setSpeciesNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    if (isLocationBased) return;
    const ids = speciesOptions
      .filter((s): s is Extract<EncounterSpeciesOption, { kind: 'static' }> => s.kind === 'static')
      .map((s) => s.speciesId);
    if (ids.length === 0) {
      setSpeciesNames(new Map());
      return;
    }
    void initMainThreadWasm().then(async () => {
      const { get_species_name } = await import('@/wasm/wasm_pkg.js');
      const map = new Map<number, string>();
      for (const id of ids) {
        map.set(id, get_species_name(id, language));
      }
      setSpeciesNames(map);
    });
  }, [speciesOptions, isLocationBased, language]);

  // offset / max_advance ローカル state
  const [localOffset, setLocalOffset] = useState(String(genConfig.user_offset));
  const [localMaxAdv, setLocalMaxAdv] = useState(String(genConfig.max_advance));

  // シンクロ性格
  const [syncNature, setSyncNature] = useState<Nature>('Adamant');

  // カテゴリ変更ハンドラ
  const handleCategoryChange = useCallback(
    (categoryKey: string) => {
      setSelectedCategory(categoryKey);
      const cat = ENCOUNTER_CATEGORIES.find((c) => c.labelKey === categoryKey);
      if (!cat || cat.types.length === 0) return;

      // サブタイプが 1 つだけの場合は自動選択
      const firstType = cat.types[0];
      const newType = firstType as EncounterType;
      onEncounterTypeChange(newType);
      setSelectedLocation('');
      setSelectedStaticEntry('');
      onSlotsChange([]);
      onAvailableSpeciesChange([]);
      if (!isLocationBasedEncounter(firstType)) {
        onEncounterMethodChange('Stationary');
      }
    },
    [onEncounterTypeChange, onEncounterMethodChange, onSlotsChange, onAvailableSpeciesChange]
  );

  // エンカウントサブタイプ変更
  const handleEncounterTypeChange = useCallback(
    (value: string) => {
      const newType = value as EncounterType;
      onEncounterTypeChange(newType);
      setSelectedLocation('');
      setSelectedStaticEntry('');
      onSlotsChange([]);
      onAvailableSpeciesChange([]);

      // 固定エンカウントの場合は Stationary 固定
      if (!isLocationBasedEncounter(value as EncounterMethodKey | StaticEncounterTypeKey)) {
        onEncounterMethodChange('Stationary');
      }
    },
    [onEncounterTypeChange, onEncounterMethodChange, onSlotsChange, onAvailableSpeciesChange]
  );

  // ロケーション変更
  const handleLocationChange = useCallback(
    (locationKey: string) => {
      setSelectedLocation(locationKey);
      const slots = getEncounterSlots(gameVersion, locationKey, encounterType);
      if (slots) {
        onSlotsChange(toEncounterSlotConfigs(slots));
      } else {
        onSlotsChange([]);
      }
      const newSpecies = listSpecies(gameVersion, encounterType as EncounterMethodKey, locationKey);
      onAvailableSpeciesChange(newSpecies);
    },
    [gameVersion, encounterType, onSlotsChange, onAvailableSpeciesChange]
  );

  // 固定ポケモン変更
  const handleStaticEntryChange = useCallback(
    (entryId: string) => {
      setSelectedStaticEntry(entryId);
      const entry = getStaticEncounterEntry(gameVersion, encounterType, entryId);
      if (entry) {
        onSlotsChange([toEncounterSlotConfigFromEntry(entry)]);
      } else {
        onSlotsChange([]);
      }
    },
    [gameVersion, encounterType, onSlotsChange]
  );

  // 先頭特性変更
  const handleLeadAbilityChange = useCallback(
    (value: string) => {
      switch (value) {
        case 'None': {
          onLeadAbilityChange('None');
          break;
        }
        case 'CompoundEyes': {
          onLeadAbilityChange('CompoundEyes');
          break;
        }
        case 'Synchronize': {
          onLeadAbilityChange({ Synchronize: syncNature });
          break;
        }
      }
    },
    [onLeadAbilityChange, syncNature]
  );

  const handleSyncNatureChange = useCallback(
    (value: string) => {
      const nature = value as Nature;
      setSyncNature(nature);
      if (typeof leadAbility === 'object' && 'Synchronize' in leadAbility) {
        onLeadAbilityChange({ Synchronize: nature });
      }
    },
    [leadAbility, onLeadAbilityChange]
  );

  // offset / max_advance blur handlers
  const handleOffsetBlur = useCallback(() => {
    const clamped = clampOrDefault(localOffset, {
      defaultValue: 0,
      min: 0,
      max: 999_999,
    });
    setLocalOffset(String(clamped));
    onGenConfigChange({ ...genConfig, user_offset: clamped });
  }, [localOffset, genConfig, onGenConfigChange]);

  const handleMaxAdvBlur = useCallback(() => {
    const clamped = clampOrDefault(localMaxAdv, {
      defaultValue: 100,
      min: 0,
      max: 999_999,
    });
    setLocalMaxAdv(String(clamped));
    onGenConfigChange({ ...genConfig, max_advance: clamped });
  }, [localMaxAdv, genConfig, onGenConfigChange]);

  const leadAbilityValue =
    typeof leadAbility === 'object' && 'Synchronize' in leadAbility
      ? 'Synchronize'
      : (leadAbility as string);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        <Trans>Encounter settings</Trans>
      </h3>

      {/* エンカウント大分類 */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          <Trans>Encounter category</Trans>
        </Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENCOUNTER_CATEGORIES.map((cat) => (
              <SelectItem key={cat.labelKey} value={cat.labelKey}>
                {cat.labels[language]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* エンカウント中分類 (サブタイプが 2 つ以上ある場合のみ表示) */}
      {categorySubTypes.length > 1 && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Encounter type</Trans>
          </Label>
          <Select
            value={encounterType}
            onValueChange={handleEncounterTypeChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorySubTypes.map((et) => (
                <SelectItem key={et} value={et}>
                  {getEncounterTypeLabel(et, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ロケーション (ロケーションベースのみ) */}
      {isLocationBased && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Location</Trans>
          </Label>
          <Select
            value={selectedLocation}
            onValueChange={handleLocationChange}
            disabled={disabled || locations.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t`Select location`} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.key} value={loc.key}>
                  {getEncounterLocationName(loc.displayNameKey, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 固定ポケモン (固定エンカウントのみ) */}
      {!isLocationBased && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Pokémon</Trans>
          </Label>
          <Select
            value={selectedStaticEntry}
            onValueChange={handleStaticEntryChange}
            disabled={disabled || speciesOptions.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t`Select Pokémon`} />
            </SelectTrigger>
            <SelectContent>
              {speciesOptions
                .filter(
                  (s): s is Extract<EncounterSpeciesOption, { kind: 'static' }> =>
                    s.kind === 'static'
                )
                .map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {speciesNames.get(entry.speciesId) ?? entry.displayNameKey} (Lv.{entry.level})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* エンカウント方法 (ロケーションベースのみ) */}
      {isLocationBased && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Encounter method</Trans>
          </Label>
          <Select
            value={encounterMethod}
            onValueChange={(v) => onEncounterMethodChange(v as EncounterMethod)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Stationary">{t`Stationary`}</SelectItem>
              <SelectItem value="Moving">{t`Moving`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 先頭特性 */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          <Trans>Lead ability</Trans>
        </Label>
        <Select
          value={leadAbilityValue}
          onValueChange={handleLeadAbilityChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">{t`None`}</SelectItem>
            <SelectItem value="Synchronize">{t`Synchronize`}</SelectItem>
            <SelectItem value="CompoundEyes">{t`Compound Eyes`}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* シンクロ性格 (Synchronize 選択時のみ) */}
      {leadAbilityValue === 'Synchronize' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Synchronize nature</Trans>
          </Label>
          <Select value={syncNature} onValueChange={handleSyncNatureChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NATURE_ORDER.map((n) => (
                <SelectItem key={n} value={n}>
                  {getNatureName(n, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* offset / max_advance */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="pokemon-offset" className="text-xs">
            <Trans>Start offset</Trans>
          </Label>
          <Input
            id="pokemon-offset"
            type="number"
            inputMode="numeric"
            className="h-7 text-xs tabular-nums"
            value={localOffset}
            onChange={(e) => setLocalOffset(e.target.value)}
            onBlur={handleOffsetBlur}
            onFocus={handleFocusSelectAll}
            min={0}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pokemon-max-advance" className="text-xs">
            <Trans>Max advance</Trans>
          </Label>
          <Input
            id="pokemon-max-advance"
            type="number"
            inputMode="numeric"
            className="h-7 text-xs tabular-nums"
            value={localMaxAdv}
            onChange={(e) => setLocalMaxAdv(e.target.value)}
            onBlur={handleMaxAdvBlur}
            onFocus={handleFocusSelectAll}
            min={0}
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );
}

export { PokemonParamsForm };
export type { PokemonParamsFormProps };
