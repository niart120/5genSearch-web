/**
 * SeedIvTooltip コンポーネントテスト
 */

import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedIvTooltip } from '@/components/data-display/seed-iv-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { IvTooltipContext } from '@/lib/iv-tooltip';

// WASM モジュールのモック
vi.mock('@/wasm/wasm_pkg.js', () => ({
  compute_iv_spread: vi.fn(() => ({
    hp: 31,
    atk: 0,
    def: 31,
    spa: 30,
    spd: 31,
    spe: 30,
  })),
}));

const BW_CONTEXTS: IvTooltipContext[] = [
  { labelKey: 'bw-wild', mtOffset: 0, isRoamer: false },
  { labelKey: 'bw-roamer', mtOffset: 1, isRoamer: true },
];

const BW2_CONTEXTS: IvTooltipContext[] = [{ labelKey: 'bw2-wild', mtOffset: 2, isRoamer: false }];

function renderTooltip(contexts: IvTooltipContext[] = BW_CONTEXTS) {
  return render(
    <I18nTestWrapper>
      <TooltipProvider delayDuration={0}>
        <SeedIvTooltip mtSeed={0x12_34_56_78} contexts={contexts}>
          <span>trigger</span>
        </SeedIvTooltip>
      </TooltipProvider>
    </I18nTestWrapper>
  );
}

/** Radix Tooltip を jsdom 上で開き tooltip 要素を返すヘルパー */
async function openTooltip(): Promise<HTMLElement> {
  const trigger = screen.getByText('trigger');
  await act(async () => {
    fireEvent.pointerEnter(trigger);
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    fireEvent.focus(trigger);
    await new Promise((r) => setTimeout(r, 0));
  });
  let tooltip: HTMLElement | undefined;
  await waitFor(() => {
    tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeDefined();
  });
  return tooltip!;
}

describe('SeedIvTooltip', () => {
  beforeEach(() => {
    setupTestI18n('en');
    useUiStore.setState({ language: 'en' });
  });

  it('トリガー要素が描画される', () => {
    renderTooltip();
    expect(screen.getByText('trigger')).toBeDefined();
  });

  it('ホバー時にツールチップ内容が表示される', async () => {
    renderTooltip();
    const tooltip = await openTooltip();
    const scope = within(tooltip);

    expect(scope.getByText('BW Stationary/Wild (offset 0)')).toBeDefined();
    expect(scope.getByText('BW Roamer (offset 1)')).toBeDefined();
  });

  it('BW 版: 2 コンテキスト分の行が表示される', async () => {
    renderTooltip(BW_CONTEXTS);
    const tooltip = await openTooltip();
    const scope = within(tooltip);

    expect(scope.getByText('BW Stationary/Wild (offset 0)')).toBeDefined();
    expect(scope.getByText('BW Roamer (offset 1)')).toBeDefined();
  });

  it('BW2 版: 1 コンテキスト分の行が表示される', async () => {
    renderTooltip(BW2_CONTEXTS);
    const tooltip = await openTooltip();
    const scope = within(tooltip);

    expect(scope.getByText('BW2 Stationary/Wild (offset 2)')).toBeDefined();
    expect(scope.queryByText('BW Roamer (offset 1)')).toBeNull();
  });

  it('IV スプレッドがフォーマットされて表示される', async () => {
    renderTooltip(BW2_CONTEXTS);
    const tooltip = await openTooltip();
    const scope = within(tooltip);

    expect(scope.getByText('31-0-31-30-31-30')).toBeDefined();
  });
});
