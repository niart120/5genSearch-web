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

  it.each(['start', 'end', 'both'] as const)(
    '%s の不正な日付だけを示し、前後関係は表示しない',
    (side) => {
      renderDateRange({
        value: {
          start_year: 2025,
          start_month: 2,
          start_day: side === 'end' ? 28 : 29,
          end_year: 2024,
          end_month: 2,
          end_day: side === 'start' ? 29 : 30,
        },
      });
      expect(screen.getAllByText('Enter a valid date')).toHaveLength(side === 'both' ? 2 : 1);
      expect(
        screen.queryByText('Start date must be on or before end date')
      ).not.toBeInTheDocument();
      for (const endpoint of ['start', 'end'] as const) {
        const invalid = side === endpoint || side === 'both';
        const input = screen.getByRole('textbox', { name: `date-${endpoint} day` });
        expect(input).toHaveAttribute('aria-invalid', String(invalid));
        if (invalid) expect(input).toHaveAccessibleDescription('Enter a valid date');
        else expect(input).not.toHaveAttribute('aria-describedby');
      }
    }
  );

  it('両端が有効な逆転では前後関係だけを表示する', () => {
    renderDateRange({ value: { ...DEFAULT_VALUE, start_year: 2025, end_year: 2024 } });
    expect(screen.getAllByText('Start date must be on or before end date')).toHaveLength(1);
    expect(screen.queryByText('Enter a valid date')).not.toBeInTheDocument();
    for (const side of ['start', 'end']) {
      expect(screen.getByRole('textbox', { name: `date-${side} day` })).toHaveAccessibleDescription(
        'Start date must be on or before end date'
      );
    }
  });

  it('日付の修正で不正日付→逆転→エラーなしへ切り替わる', () => {
    const onChange = vi.fn();
    const value = {
      start_year: 2025,
      start_month: 2,
      start_day: 29,
      end_year: 2025,
      end_month: 1,
      end_day: 1,
    };
    const { rerender } = renderDateRange({ value, onChange });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid date');
    rerender(
      <I18nTestWrapper>
        <DateRangePicker value={{ ...value, start_day: 28 }} onChange={onChange} />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Start date must be on or before end date');
    rerender(
      <I18nTestWrapper>
        <DateRangePicker value={{ ...value, start_day: 28, end_month: 3 }} onChange={onChange} />
      </I18nTestWrapper>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([true, false])('無効な入力欄はエラーを表示しない (不正日付=%s)', (invalidDate) => {
    renderDateRange({
      disabled: true,
      value: {
        ...DEFAULT_VALUE,
        start_year: 2025,
        start_month: 2,
        start_day: invalidDate ? 29 : 28,
        end_year: 2024,
      },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
