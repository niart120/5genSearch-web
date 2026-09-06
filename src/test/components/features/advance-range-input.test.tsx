import { useState } from 'react';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvanceRangeInput } from '@/components/forms/advance-range-input';
import { commitActiveInput } from '@/components/forms/input-helpers';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

describe('AdvanceRangeInput', () => {
  beforeEach(() => setupTestI18n('en'));
  it.each([99_999, 999_999])(
    'keeps drafts until commit and clamps to the page limit %i',
    async (limit) => {
      const user = userEvent.setup();
      const changed = vi.fn();
      render(
        <I18nTestWrapper>
          <AdvanceRangeInput
            value={{ user_offset: 100, max_advance: 200 }}
            limit={limit}
            onChange={changed}
          />
          <button type="button" onPointerDown={commitActiveInput}>
            Search
          </button>
        </I18nTestWrapper>
      );
      const input = screen.getByRole('spinbutton', { name: 'Max advance' });
      await user.clear(input);
      await user.type(input, '1000000');
      expect(changed).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Search' }));
      expect(changed).toHaveBeenLastCalledWith({ max_advance: limit });
      expect(input).toHaveValue(limit);
    }
  );
  it('preserves reversed bounds for page validation instead of swapping or extending them', async () => {
    const user = userEvent.setup();
    function Form() {
      const [value, setValue] = useState({ user_offset: 100, max_advance: 200 });
      return (
        <AdvanceRangeInput
          value={value}
          onChange={(partial) => setValue((prev) => ({ ...prev, ...partial }))}
        />
      );
    }
    render(
      <I18nTestWrapper>
        <Form />
      </I18nTestWrapper>
    );
    const min = screen.getByRole('spinbutton', { name: 'Min advance' });
    await user.clear(min);
    await user.type(min, '201');
    await user.tab();
    expect(min).toHaveValue(201);
    expect(screen.getByRole('spinbutton', { name: 'Max advance' })).toHaveValue(200);
  });
  it('disables both inputs', () => {
    render(
      <I18nTestWrapper>
        <AdvanceRangeInput
          value={{ user_offset: 0, max_advance: 30 }}
          onChange={vi.fn()}
          disabled
        />
      </I18nTestWrapper>
    );
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled();
  });
});
