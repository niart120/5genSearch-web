import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateRangePicker } from '@/components/forms/date-range-picker';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { DateRangeParams } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2099,
  end_month: 12,
  end_day: 31,
};

function renderDateRange(props: Partial<Parameters<typeof DateRangePicker>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <DateRangePicker value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('DateRangePicker', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('初期値が表示される', () => {
    renderDateRange();
    const startYear = screen.getByRole('textbox', { name: 'date-start year' });
    const startMonth = screen.getByRole('textbox', { name: 'date-start month' });
    const startDay = screen.getByRole('textbox', { name: 'date-start day' });
    const endYear = screen.getByRole('textbox', { name: 'date-end year' });

    expect(startYear).toHaveValue('2000');
    expect(startMonth).toHaveValue('1');
    expect(startDay).toHaveValue('1');
    expect(endYear).toHaveValue('2099');
  });

  it('年が範囲外のときクランプされる (1999 → 2000)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderDateRange({ onChange });

    const startYear = screen.getByRole('textbox', { name: 'date-start year' });
    await user.clear(startYear);
    await user.type(startYear, '1999');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall.start_year).toBe(2000);
  });

  it('年が範囲外のときクランプされる (2100 → 2099)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderDateRange({ onChange });

    const endYear = screen.getByRole('textbox', { name: 'date-end year' });
    await user.clear(endYear);
    await user.type(endYear, '2100');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall.end_year).toBe(2099);
  });

  it('月が範囲外のときクランプされる (0 → 1, 13 → 12)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderDateRange({ onChange });

    const startMonth = screen.getByRole('textbox', { name: 'date-start month' });
    await user.clear(startMonth);
    await user.type(startMonth, '0');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ start_month: 1 }));
  });

  it('日が範囲外のときクランプされる (0 → 1, 32 → 31)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderDateRange({ onChange });

    const startDay = screen.getByRole('textbox', { name: 'date-start day' });
    await user.clear(startDay);
    await user.type(startDay, '32');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ start_day: 31 }));
  });

  it('各フィールドの変更が onChange に反映される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderDateRange({ onChange });

    const endMonth = screen.getByRole('textbox', { name: 'date-end month' });
    await user.clear(endMonth);
    await user.type(endMonth, '6');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ end_month: 6 }));
  });
});
