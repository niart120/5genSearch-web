import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeRangePicker } from '@/components/forms/time-range-picker';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { TimeRangeParams } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

function renderTimeRange(props: Partial<Parameters<typeof TimeRangePicker>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <TimeRangePicker value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('TimeRangePicker', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('初期値が表示される', () => {
    renderTimeRange();
    const hourStart = screen.getByRole('textbox', { name: 'time-hour start' });
    const hourEnd = screen.getByRole('textbox', { name: 'time-hour end' });
    const minuteStart = screen.getByRole('textbox', { name: 'time-minute start' });
    const minuteEnd = screen.getByRole('textbox', { name: 'time-minute end' });
    const secondStart = screen.getByRole('textbox', { name: 'time-second start' });
    const secondEnd = screen.getByRole('textbox', { name: 'time-second end' });

    expect(hourStart).toHaveValue('0');
    expect(hourEnd).toHaveValue('23');
    expect(minuteStart).toHaveValue('0');
    expect(minuteEnd).toHaveValue('59');
    expect(secondStart).toHaveValue('0');
    expect(secondEnd).toHaveValue('59');
  });

  it('時が範囲外のときクランプされる (24 → 23)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const hourEnd = screen.getByRole('textbox', { name: 'time-hour end' });
    await user.clear(hourEnd);
    await user.type(hourEnd, '24');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour_end: 23 }));
  });

  it('分が範囲外のときクランプされる (60 → 59)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const minuteEnd = screen.getByRole('textbox', { name: 'time-minute end' });
    await user.clear(minuteEnd);
    await user.type(minuteEnd, '60');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minute_end: 59 }));
  });

  it('秒が範囲外のときクランプされる (60 → 59)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const secondEnd = screen.getByRole('textbox', { name: 'time-second end' });
    await user.clear(secondEnd);
    await user.type(secondEnd, '60');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ second_end: 59 }));
  });

  it('負の値はクランプされる (-1 → 0)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const hourStart = screen.getByRole('textbox', { name: 'time-hour start' });
    await user.clear(hourStart);
    await user.type(hourStart, '-1');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour_start: 0 }));
  });

  it('独立した start/end が設定できる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const minuteStart = screen.getByRole('textbox', { name: 'time-minute start' });
    await user.clear(minuteStart);
    await user.type(minuteStart, '20');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minute_start: 20 }));
  });

  it('6 フィールドが正しく onChange に渡る', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTimeRange({ onChange });

    const hourStart = screen.getByRole('textbox', { name: 'time-hour start' });
    await user.clear(hourStart);
    await user.type(hourStart, '10');
    await user.tab();

    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall).toEqual(
      expect.objectContaining({
        hour_start: 10,
        hour_end: 23,
        minute_start: 0,
        minute_end: 59,
        second_start: 0,
        second_end: 59,
      })
    );
  });
});
