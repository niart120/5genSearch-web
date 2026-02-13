/**
 * エンカウント / 生成パラメータ入力フォーム
 *
 * EncounterType → Location or Static Pokemon → EncounterMethod 選択 → advance 範囲設定。
 * フォーム内でエンカウント関連の状態をすべて管理し、onChange で集約結果を親に報告する。
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
import {
  getEncounterLocationName,
  getEncounterMethodName,
  toGameVersion,
} from '@/lib/game-data-names';
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
import { get_species_name } from '@/wasm/wasm_pkg.js';
import { ENCOUNTER_CATEGORIES, findCategoryForType } from './encounter-constants';
import { LeadAbilitySection } from './lead-ability-section';
import type { EncounterParamsOutput } from '../types';
import type { EncounterMethodKey, StaticEncounterTypeKey } from '@/data/encounters/schema';
import type { EncounterType, EncounterMethod, RomVersion } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PokemonParamsFormProps {
  value: EncounterParamsOutput;
  onChange: (params: EncounterParamsOutput) => void;
  version: RomVersion;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonParamsForm({
  value,
  onChange,
  version,
  disabled,
}: PokemonParamsFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const gameVersion = toGameVersion(version);

  // value から読み出し (controlled component)
  const { encounterType, encounterMethod, leadAbility, genConfig } = value;

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

  // ロケーション一覧 (非同期ロード)
  const [locations, setLocations] = useState<LocationOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = isLocationBased
        ? await listLocations(gameVersion, encounterType as EncounterMethodKey)
        : [];
      if (!cancelled) setLocations(result);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameVersion, encounterType, isLocationBased]);

  // 種族一覧 (非同期ロード)
  const [speciesOptions, setSpeciesOptions] = useState<EncounterSpeciesOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = isLocationBased
        ? selectedLocation
          ? await listSpecies(gameVersion, encounterType as EncounterMethodKey, selectedLocation)
          : []
        : await listSpecies(gameVersion, encounterType as StaticEncounterTypeKey);
      if (!cancelled) setSpeciesOptions(result);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameVersion, encounterType, isLocationBased, selectedLocation]);

  // 固定エンカウントの種族名解決 (WASM 経由)
  // 解決対象の speciesId リストをキー化し、effect 内では非同期 setState のみ行う
  const staticSpeciesIds = useMemo(
    () =>
      isLocationBased
        ? []
        : speciesOptions
            .filter(
              (s): s is Extract<EncounterSpeciesOption, { kind: 'static' }> => s.kind === 'static'
            )
            .map((s) => s.speciesId),
    [speciesOptions, isLocationBased]
  );
  const [resolvedNames, setResolvedNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    if (staticSpeciesIds.length === 0) return;
    let cancelled = false;
    void initMainThreadWasm().then(() => {
      if (cancelled) return;
      const map = new Map<number, string>();
      for (const id of staticSpeciesIds) {
        map.set(id, get_species_name(id, language));
      }
      setResolvedNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, [staticSpeciesIds, language]);
  // staticSpeciesIds が空の場合は resolvedNames を使わず空 Map を返す
  const speciesNames = staticSpeciesIds.length > 0 ? resolvedNames : new Map<number, string>();

  // offset / max_advance ローカル state
  const [localOffset, setLocalOffset] = useState(String(genConfig.user_offset));
  const [localMaxAdv, setLocalMaxAdv] = useState(String(genConfig.max_advance));

  // カテゴリ変更ハンドラ
  const handleCategoryChange = useCallback(
    (categoryKey: string) => {
      setSelectedCategory(categoryKey);
      const cat = ENCOUNTER_CATEGORIES.find((c) => c.labelKey === categoryKey);
      if (!cat || cat.types.length === 0) return;

      const firstType = cat.types[0];
      const newType = firstType as EncounterType;
      const newMethod = isLocationBasedEncounter(firstType)
        ? value.encounterMethod
        : ('Stationary' as EncounterMethod);
      setSelectedLocation('');
      setSelectedStaticEntry('');
      onChange({
        ...value,
        encounterType: newType,
        encounterMethod: newMethod,
        slots: [],
        availableSpecies: [],
      });
    },
    [value, onChange]
  );

  // エンカウントサブタイプ変更
  const handleEncounterTypeChange = useCallback(
    (newValue: string) => {
      const newType = newValue as EncounterType;
      const newMethod = isLocationBasedEncounter(
        newValue as EncounterMethodKey | StaticEncounterTypeKey
      )
        ? value.encounterMethod
        : ('Stationary' as EncounterMethod);
      setSelectedLocation('');
      setSelectedStaticEntry('');
      onChange({
        ...value,
        encounterType: newType,
        encounterMethod: newMethod,
        slots: [],
        availableSpecies: [],
      });
    },
    [value, onChange]
  );

  // ロケーション変更
  const handleLocationChange = useCallback(
    (locationKey: string) => {
      setSelectedLocation(locationKey);
      void (async () => {
        const slots = await getEncounterSlots(gameVersion, locationKey, encounterType);
        const newSlots = slots ? toEncounterSlotConfigs(slots) : [];
        const newSpecies = await listSpecies(
          gameVersion,
          encounterType as EncounterMethodKey,
          locationKey
        );
        onChange({ ...value, slots: newSlots, availableSpecies: newSpecies });
      })();
    },
    [gameVersion, encounterType, value, onChange]
  );

  // 固定ポケモン変更
  const handleStaticEntryChange = useCallback(
    (entryId: string) => {
      setSelectedStaticEntry(entryId);
      void (async () => {
        const entry = await getStaticEncounterEntry(gameVersion, encounterType, entryId);
        const newSlots = entry ? [toEncounterSlotConfigFromEntry(entry)] : [];
        onChange({ ...value, slots: newSlots });
      })();
    },
    [gameVersion, encounterType, value, onChange]
  );

  // offset / max_advance blur handlers
  const handleOffsetBlur = useCallback(() => {
    const clamped = clampOrDefault(localOffset, {
      defaultValue: 0,
      min: 0,
      max: 999_999,
    });
    setLocalOffset(String(clamped));
    onChange({ ...value, genConfig: { ...value.genConfig, user_offset: clamped } });
  }, [localOffset, value, onChange]);

  const handleMaxAdvBlur = useCallback(() => {
    const clamped = clampOrDefault(localMaxAdv, {
      defaultValue: 100,
      min: 0,
      max: 999_999,
    });
    setLocalMaxAdv(String(clamped));
    onChange({ ...value, genConfig: { ...value.genConfig, max_advance: clamped } });
  }, [localMaxAdv, value, onChange]);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        <Trans>Encounter settings</Trans>
      </h3>

      {/* エンカウント大分類 + 中分類 (1行レイアウト) */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          <Trans>Encounter type</Trans>
        </Label>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={disabled}>
            <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
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
          {categorySubTypes.length > 1 && (
            <Select
              value={encounterType}
              onValueChange={handleEncounterTypeChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorySubTypes.map((et) => (
                  <SelectItem key={et} value={et}>
                    {getEncounterMethodName(et, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

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
            onValueChange={(v) => onChange({ ...value, encounterMethod: v as EncounterMethod })}
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
      <LeadAbilitySection
        leadAbility={leadAbility}
        onChange={(newAbility) => onChange({ ...value, leadAbility: newAbility })}
        language={language}
        disabled={disabled}
      />

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
