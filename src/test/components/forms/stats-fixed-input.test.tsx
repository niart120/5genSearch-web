import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatsFixedInput } from '@/components/forms/stats-fixed-input';

describe('StatsFixedInput', () => {
  it('外部 value の変更をローカル表示へ反映する', () => {
    const onChange = vi.fn();
    const stats = {
      hp: 100,
      atk: undefined,
      def: undefined,
      spa: undefined,
      spd: undefined,
      spe: undefined,
    };
    const { rerender } = render(<StatsFixedInput value={stats} onChange={onChange} />);

    rerender(<StatsFixedInput value={{ ...stats, hp: 200 }} onChange={onChange} />);

    expect(screen.getByLabelText('H stats')).toHaveValue('200');
  });
});
