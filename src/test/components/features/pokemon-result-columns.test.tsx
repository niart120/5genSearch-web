import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '@/components/data-display/data-table';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { createPokemonResultColumns } from '@/features/pokemon-list/components/pokemon-result-columns';
import type { EncounterType, UiPokemonData } from '@/wasm/wasm_pkg.js';

const TEST_RESULT: UiPokemonData = {
  advance: 1,
  needle_direction: 0,
  base_seed: '0000000000000000',
  mt_seed: '00000000',
  datetime_iso: undefined,
  timer0: undefined,
  vcount: undefined,
  key_input: undefined,
  species_name: 'フシギダネ',
  nature_name: 'がんばりや',
  ability_name: 'しんりょく',
  gender_symbol: '♂',
  shiny_symbol: '',
  level: 5,
  ivs: ['1', '2', '3', '4', '5', '6'],
  stats: ['11', '12', '13', '14', '15', '16'],
  hidden_power_type: 'あく',
  hidden_power_power: '70',
  pid: '00000000',
  sync_applied: false,
  held_item_name: undefined,
  moving_encounter_guaranteed: undefined,
  special_encounter_triggered: '〇',
  special_encounter_direction: '右',
  encounter_result: 'ポケモン',
};

function renderColumns(resultEncounterType: EncounterType | undefined) {
  return render(
    <I18nTestWrapper>
      <DataTable
        columns={createPokemonResultColumns({ resultEncounterType, locale: 'ja' })}
        data={[TEST_RESULT]}
        className="h-96"
      />
    </I18nTestWrapper>
  );
}

describe('createPokemonResultColumns', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it.each([
    ['ShakingGrass', '揺れる草むら'],
    ['DustCloud', '土煙'],
    ['SurfingBubble', 'なみのり(泡)'],
    ['FishingBubble', 'つり(泡)'],
    ['PokemonShadow', 'ポケモンの影'],
  ] as const)('%s の結果では %s 列を表示する', (resultEncounterType, header) => {
    renderColumns(resultEncounterType);

    expect(screen.getByText(header)).toBeInTheDocument();
  });

  it('土煙列を針の直後に挿入し、発生記号を参照する', () => {
    renderColumns('DustCloud');

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.indexOf('土煙')).toBe(headers.indexOf('Needle') + 1);

    const specialColumn = createPokemonResultColumns({
      resultEncounterType: 'DustCloud',
      locale: 'ja',
    }).find((column) => column.id === 'special_encounter_triggered');
    expect(specialColumn).toBeDefined();
    expect(
      specialColumn && 'accessorFn' in specialColumn
        ? specialColumn.accessorFn?.(TEST_RESULT, 0)
        : undefined
    ).toBe('〇');
  });

  it.each<EncounterType>(['Normal', 'StaticSymbol'])(
    '%s の結果では発生列を表示しない',
    (resultEncounterType) => {
      renderColumns(resultEncounterType);

      expect(screen.queryByText('土煙')).not.toBeInTheDocument();
      expect(
        createPokemonResultColumns({ resultEncounterType, locale: 'ja' }).some(
          (column) => column.id === 'special_encounter_triggered'
        )
      ).toBe(false);
    }
  );
});
