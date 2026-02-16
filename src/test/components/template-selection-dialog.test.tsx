/**
 * TemplateSelectionDialog コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateSelectionDialog } from '@/features/datetime-search/components/template-selection-dialog';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { RomVersion } from '@/wasm/wasm_pkg';

function renderDialog(
  props: Partial<Parameters<typeof TemplateSelectionDialog>[0]> & {
    currentVersion?: RomVersion;
  } = {}
) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onApply = props.onApply ?? vi.fn();
  return {
    onOpenChange,
    onApply,
    ...render(
      <I18nTestWrapper>
        <TemplateSelectionDialog
          open={props.open ?? true}
          onOpenChange={onOpenChange}
          onApply={onApply}
          currentVersion={props.currentVersion ?? 'Black'}
        />
      </I18nTestWrapper>
    ),
  };
}

describe('TemplateSelectionDialog', () => {
  beforeEach(() => {
    setupTestI18n('en');
    useUiStore.setState({ language: 'en' });
  });

  it('ダイアログ表示時にテンプレート一覧が描画される', () => {
    renderDialog({ currentVersion: 'Black' });

    // BW 固定・野生 6V テンプレートが表示される
    expect(screen.getByText('BW Stationary/Wild 6V')).toBeDefined();
    // BW 徘徊 6V テンプレートも表示される
    expect(screen.getByText('BW Roamer 6V')).toBeDefined();
  });

  it('BW2 バージョンでは BW2 テンプレートのみ表示される', () => {
    renderDialog({ currentVersion: 'Black2' });

    expect(screen.getByText('BW2 Stationary/Wild 6V')).toBeDefined();
    // BW テンプレートは表示されない
    expect(screen.queryByText('BW Stationary/Wild 6V')).toBeNull();
    // BW 徘徊テンプレートも表示されない
    expect(screen.queryByText('BW Roamer 6V')).toBeNull();
  });

  it('選択なし状態で「Apply」ボタンが disabled', () => {
    renderDialog();

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeDisabled();
  });

  it('Checkbox 選択 → 「Apply」ボタン押下で onApply が正しい Seed 配列を返す', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderDialog({ onApply, currentVersion: 'Black' });

    // BW 固定・野生 6V テンプレートの checkbox をクリック
    const checkboxes = screen.getAllByRole('checkbox');
    // 最初のチェックボックスは BW 固定・野生 6V
    await user.click(checkboxes[0]);

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).not.toBeDisabled();
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledOnce();
    const seeds = onApply.mock.calls[0][0] as number[];
    // BW 固定・野生 6V は 5 seeds
    expect(seeds).toHaveLength(5);
    // 各 seed が有効な 32bit 整数
    for (const seed of seeds) {
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xff_ff_ff_ff);
    }
  });

  it('複数テンプレート選択時に Seed が重複排除で統合される', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderDialog({ onApply, currentVersion: 'Black' });

    const checkboxes = screen.getAllByRole('checkbox');
    // 最初の 2 つのテンプレートを選択
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledOnce();
    const seeds = onApply.mock.calls[0][0] as number[];
    // 重複排除されるので seed は Set に変換しても同じサイズ
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('キャンセルボタンクリック時に onOpenChange(false) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
