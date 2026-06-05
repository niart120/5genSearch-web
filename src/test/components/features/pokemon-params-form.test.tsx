import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonParamsForm } from '@/features/pokemon-list/components/pokemon-params-form';
import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';

vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: vi.fn(() => 'Bulbasaur'),
}));

vi.mock('@/data/encounters/helpers', () => ({
  isLocationBasedEncounter: vi.fn(() => false),
  listLocations: vi.fn(() => Promise.resolve([])),
  listSpecies: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/data/encounters/loader', () => ({
  getEncounterSlots: vi.fn(() => Promise.resolve()),
  getStaticEncounterEntry: vi.fn(() => Promise.resolve()),
}));

function renderForm(props: Partial<Parameters<typeof PokemonParamsForm>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <PokemonParamsForm
          value={DEFAULT_ENCOUNTER_PARAMS}
          onChange={onChange}
          version="Black"
          {...props}
        />
      </I18nTestWrapper>
    ),
  };
}

describe('PokemonParamsForm', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('syncKey 変更で未確定の offset 表示が外部値に戻る', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = renderForm({ onChange, syncKey: 0 });

    const offsetInput = screen.getByLabelText('Start offset') as HTMLInputElement;
    await user.clear(offsetInput);
    await user.type(offsetInput, '77');
    expect(offsetInput.value).toBe('77');

    rerender(
      <I18nTestWrapper>
        <PokemonParamsForm
          value={DEFAULT_ENCOUNTER_PARAMS}
          onChange={onChange}
          version="Black"
          syncKey={1}
        />
      </I18nTestWrapper>
    );

    expect(offsetInput.value).toBe('0');
  });
});
