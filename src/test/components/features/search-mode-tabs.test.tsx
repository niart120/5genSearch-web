import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchModeTabs } from '@/features/pokemon-search/components/search-mode-tabs';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

function RemountingPages() {
  const mode = usePokemonSearchStore((state) => state.mode);
  return (
    <SearchModeTabs key={mode}>
      <p>{mode}</p>
    </SearchModeTabs>
  );
}

describe('SearchModeTabs', () => {
  it('keeps focus on the selected tab when the mode-specific page remounts', async () => {
    setupTestI18n('ja');
    usePokemonSearchStore.setState(getPokemonSearchInitialState());
    render(
      <I18nTestWrapper>
        <RemountingPages />
      </I18nTestWrapper>
    );
    const iv = screen.getByRole('tab', { name: 'Search by MT Seed (IVs)' });
    act(() => iv.focus());
    fireEvent.keyDown(iv, { key: 'ArrowRight' });
    const pokemon = await screen.findByRole('tab', {
      name: 'Search by shininess / nature',
      selected: true,
    });
    expect(pokemon).toHaveFocus();
    fireEvent.keyDown(pokemon, { key: 'ArrowLeft' });
    expect(
      await screen.findByRole('tab', { name: 'Search by MT Seed (IVs)', selected: true })
    ).toHaveFocus();
  });
});
