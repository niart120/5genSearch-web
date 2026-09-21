import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { LevelRangeInput } from '@/components/forms/level-range-input';
import { DEFAULT_IV_RANGES, type IvFilterInput } from '@/lib/search-filter-context';
import { IV_STAT_KEYS, getStatLabel } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

beforeEach(() => {
  setupTestI18n('en');
  useUiStore.setState({ language: 'en' });
});

describe('範囲の逆転入力', () => {
  it.each(
    IV_STAT_KEYS.flatMap((stat) =>
      [0, 31].flatMap((target) =>
        (['min', 'max'] as const).map((first) => ({ stat, target, first }))
      )
    )
  )('個体値 $stat: $first から $target 固定に変更できる', async ({ stat, target, first }) => {
    const initial = target === 31 ? 0 : 31;
    let actual: IvFilterInput = {
      ...DEFAULT_IV_RANGES,
      [stat]: [initial, initial],
      enabledStats: { [stat]: true },
    };
    function Harness() {
      const [value, setValue] = useState(actual);
      return (
        <IvRangeInput
          value={value}
          onChange={(next) => {
            actual = next;
            setValue(next);
          }}
        />
      );
    }
    render(
      <I18nTestWrapper>
        <Harness />
      </I18nTestWrapper>
    );
    const user = userEvent.setup();
    const label = getStatLabel(stat, 'en');
    const inputs = {
      min: screen.getByRole('textbox', { name: `${label} min` }),
      max: screen.getByRole('textbox', { name: `${label} max` }),
    };
    for (const side of [first, first === 'min' ? 'max' : 'min'] as const) {
      await user.clear(inputs[side]);
      await user.type(inputs[side], String(target));
      await user.tab();
      expect(inputs.min).toHaveValue(String(actual[stat][0]));
      expect(inputs.max).toHaveValue(String(actual[stat][1]));
      expect(actual[stat][side === 'min' ? 0 : 1]).toBe(target);
      if (actual[stat][0] > actual[stat][1]) {
        expect(inputs.min).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toBeVisible();
      }
    }
    expect(actual[stat]).toEqual([target, target]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(
    [1, 100].flatMap((target) => (['min', 'max'] as const).map((first) => ({ target, first })))
  )('レベル: $first から $target 固定に変更できる', async ({ target, first }) => {
    const initial = target === 100 ? 1 : 100;
    let actual: [number, number] | undefined = [initial, initial];
    function Harness() {
      const [value, setValue] = useState(actual);
      return (
        <LevelRangeInput
          value={value}
          onChange={(next) => {
            actual = next;
            setValue(next);
          }}
        />
      );
    }
    render(
      <I18nTestWrapper>
        <Harness />
      </I18nTestWrapper>
    );
    const user = userEvent.setup();
    for (const side of [first, first === 'min' ? 'max' : 'min'] as const) {
      const input = screen.getByLabelText(`level-${side}`);
      await user.clear(input);
      await user.type(input, String(target));
      await user.tab();
      expect(actual?.[side === 'min' ? 0 : 1]).toBe(target);
      expect(screen.getByLabelText('level-min')).toHaveValue(actual?.[0]);
      expect(screen.getByLabelText('level-max')).toHaveValue(actual?.[1]);
    }
    expect(actual).toEqual([target, target]);
  });
});
