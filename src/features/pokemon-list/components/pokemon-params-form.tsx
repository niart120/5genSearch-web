/**
 * エンカウント / 生成パラメータ入力フォーム
 *
 * EncounterType → Location or Static Pokemon → EncounterMethod 選択 → advance 範囲設定。
 * フォーム内でエンカウント関連の状態をすべて管理し、onChange で集約結果を親に報告する。
 */

import { AdvanceRangeInput } from '@/components/forms/advance-range-input';
import { encounterSlotKey } from '@/lib/encounter-slot-context';
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getEncounterLocationName,
  getEncounterMethodName,
  toGameVersion,
} from '@/lib/game-data-names';

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
import { clearEncounterCandidates, type EncounterParamsOutput } from '../types';
import type { EncounterMethodKey, StaticEncounterTypeKey } from '@/data/encounters/schema';
import type { EncounterType, EncounterMethod, RomVersion } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const EMPTY_SPECIES: EncounterSpeciesOption[] = [];
const EMPTY_LOCATIONS: LocationOption[] = [];

interface PokemonParamsFormProps {
  value: EncounterParamsOutput;
  onChange: Dispatch<SetStateAction<EncounterParamsOutput>>;
  version: RomVersion;
  syncKey?: number;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonParamsForm({
  value,
  onChange,
  version,
  syncKey,
  disabled,
}: PokemonParamsFormProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const gameVersion = toGameVersion(version);

  // value から読み出し (controlled component)
  const {
    encounterType,
    encounterMethod,
    locationKey = '',
    staticEntryId = '',
    leadAbility,
    genConfig,
  } = value;

  const selectedCategory = findCategoryForType(encounterType) ?? 'wild';

  // 選択カテゴリのサブタイプ一覧
  const categorySubTypes = useMemo(() => {
    const cat = ENCOUNTER_CATEGORIES.find((c) => c.labelKey === selectedCategory);
    return cat?.types ?? [];
  }, [selectedCategory]);

  const isLocationBased = isLocationBasedEncounter(
    encounterType as EncounterMethodKey | StaticEncounterTypeKey
  );

  const catalogKey = JSON.stringify([version, encounterType, syncKey]);
  const [catalog, setCatalog] = useState<{
    key: string;
    locations: LocationOption[];
    species: EncounterSpeciesOption[];
    failed?: boolean;
  }>();
  const currentCatalog = catalog?.key === catalogKey ? catalog : undefined;
  const locations = currentCatalog?.locations ?? EMPTY_LOCATIONS;
  const speciesOptions = currentCatalog?.species ?? EMPTY_SPECIES;
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const locations = isLocationBased
          ? await listLocations(gameVersion, encounterType as EncounterMethodKey)
          : [];
        const species = isLocationBased
          ? []
          : await listSpecies(gameVersion, encounterType as StaticEncounterTypeKey);
        if (cancelled) return;
        setCatalog({ key: catalogKey, locations, species });
        onChange((prev) => {
          if (prev.encounterType !== encounterType) return prev;
          if (isLocationBased) {
            return prev.locationKey && !locations.some((entry) => entry.key === prev.locationKey)
              ? {
                  ...prev,
                  locationKey: '',
                  slots: [],
                  slotsContextKey: undefined,
                  availableSpecies: [],
                }
              : prev;
          }
          return prev.staticEntryId &&
            !species.some((entry) => entry.kind === 'static' && entry.id === prev.staticEntryId)
            ? {
                ...prev,
                staticEntryId: '',
                slots: [],
                slotsContextKey: undefined,
                availableSpecies: [],
              }
            : prev;
        });
      } catch {
        if (!cancelled) setCatalog({ key: catalogKey, locations: [], species: [], failed: true });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [catalogKey, gameVersion, encounterType, isLocationBased, onChange]);

  useEffect(() => {
    let cancelled = false;
    const selection = { encounterType, locationKey, staticEntryId };
    const key = encounterSlotKey(selection, version);
    onChange((prev) =>
      prev.slotsContextKey === undefined &&
      prev.slots.length === 0 &&
      prev.availableSpecies.length === 0
        ? prev
        : clearEncounterCandidates(prev)
    );
    const load = async () => {
      try {
        if (!currentCatalog || currentCatalog.failed) return;
        if (isLocationBased) {
          if (!locationKey || !currentCatalog.locations.some((entry) => entry.key === locationKey))
            return;
          const [slots, species] = await Promise.all([
            getEncounterSlots(gameVersion, locationKey, encounterType),
            listSpecies(gameVersion, encounterType as EncounterMethodKey, locationKey),
          ]);
          if (cancelled) return;
          onChange((prev) =>
            encounterSlotKey(prev, version) === key
              ? {
                  ...prev,
                  slots: slots ? toEncounterSlotConfigs(slots) : [],
                  slotsContextKey: key,
                  availableSpecies: species,
                }
              : prev
          );
        } else {
          const species = currentCatalog.species;
          const entryId = species
            .filter((s) => s.kind === 'static')
            .find((s) => s.id === staticEntryId)?.id;
          const entry = entryId
            ? await getStaticEncounterEntry(gameVersion, encounterType, entryId)
            : undefined;
          if (cancelled) return;
          onChange((prev) => {
            if (encounterSlotKey(prev, version) !== key) return prev;
            const next = {
              ...prev,
              staticEntryId: entryId ?? '',
              slots: entry ? [toEncounterSlotConfigFromEntry(entry)] : [],
              availableSpecies: species,
            };
            return { ...next, slotsContextKey: encounterSlotKey(next, version) };
          });
        }
      } catch {
        if (!cancelled)
          onChange((prev) =>
            encounterSlotKey(prev, version) === key
              ? { ...prev, slots: [], slotsContextKey: undefined, availableSpecies: [] }
              : prev
          );
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    gameVersion,
    version,
    encounterType,
    isLocationBased,
    locationKey,
    staticEntryId,
    onChange,
    syncKey,
    currentCatalog,
  ]);

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
  const speciesNames = useMemo(() => {
    if (staticSpeciesIds.length === 0) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const id of staticSpeciesIds) {
      map.set(id, get_species_name(id, language));
    }
    return map;
  }, [staticSpeciesIds, language]);

  // カテゴリ変更ハンドラ
  const handleCategoryChange = useCallback(
    (categoryKey: string) => {
      const cat = ENCOUNTER_CATEGORIES.find((c) => c.labelKey === categoryKey);
      if (!cat || cat.types.length === 0) return;

      const firstType = cat.types[0];
      const newType = firstType as EncounterType;
      onChange((prev) => {
        const newMethod = isLocationBasedEncounter(firstType)
          ? prev.encounterMethod
          : ('Stationary' as EncounterMethod);
        return {
          ...prev,
          encounterType: newType,
          encounterMethod: newMethod,
          slots: [],
          slotsContextKey: undefined,
          availableSpecies: [],
        };
      });
    },
    [onChange]
  );

  // エンカウントサブタイプ変更
  const handleEncounterTypeChange = useCallback(
    (newValue: string) => {
      const newType = newValue as EncounterType;
      onChange((prev) => {
        const newMethod = isLocationBasedEncounter(
          newValue as EncounterMethodKey | StaticEncounterTypeKey
        )
          ? prev.encounterMethod
          : ('Stationary' as EncounterMethod);
        return {
          ...prev,
          encounterType: newType,
          encounterMethod: newMethod,
          slots: [],
          slotsContextKey: undefined,
          availableSpecies: [],
        };
      });
    },
    [onChange]
  );

  // ロケーション変更 — state 更新のみ。スロット・種族の取得は effect に委譲。
  const handleLocationChange = useCallback(
    (nextLocationKey: string) => {
      onChange((prev) => ({
        ...prev,
        locationKey: nextLocationKey,
        slots: [],
        slotsContextKey: undefined,
      }));
    },
    [onChange]
  );

  const handleStaticEntryChange = useCallback(
    (entryId: string) => {
      onChange((prev) => ({
        ...prev,
        staticEntryId: entryId,
        slots: [],
        slotsContextKey: undefined,
      }));
    },
    [onChange]
  );

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

      {/* ロケーション + エンカウント方法 (同一行配置、ロケーションベースのみ) */}
      {isLocationBased && (
        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label className="text-xs">
              <Trans>Location</Trans>
            </Label>
            <Select
              value={locationKey}
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
          <div className="flex w-32 shrink-0 flex-col gap-1">
            <Label className="text-xs">
              <Trans>Encounter method</Trans>
            </Label>
            <Select
              value={encounterMethod}
              onValueChange={(v) =>
                onChange((prev) => ({ ...prev, encounterMethod: v as EncounterMethod }))
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stationary">{t`Sweet Scent`}</SelectItem>
                <SelectItem value="Moving">{t`Moving`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 固定ポケモン (固定エンカウントのみ) */}
      {!isLocationBased && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs">
            <Trans>Pokémon</Trans>
          </Label>
          <Select
            value={staticEntryId}
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

      {/* 先頭特性 */}
      <LeadAbilitySection
        leadAbility={leadAbility}
        onChange={(newAbility) => onChange((prev) => ({ ...prev, leadAbility: newAbility }))}
        language={language}
        disabled={disabled}
      />

      <AdvanceRangeInput
        value={genConfig}
        onChange={(partial) =>
          onChange((prev) => ({ ...prev, genConfig: { ...prev.genConfig, ...partial } }))
        }
        disabled={disabled}
        syncKey={syncKey}
      />
    </section>
  );
}

export { PokemonParamsForm };
export type { PokemonParamsFormProps };
