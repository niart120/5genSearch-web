/**
 * ExportToolbar コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { UseExportReturn } from '@/hooks/use-export';

function createMockActions(overrides: Partial<UseExportReturn> = {}): UseExportReturn {
  return {
    downloadCsv: vi.fn(),
    downloadJson: vi.fn(),
    copyTsv: vi.fn(async () => {}),
    includeDetails: false,
    setIncludeDetails: vi.fn(),
    hasDetailColumns: false,
    ...overrides,
  };
}

function renderToolbar(resultCount: number, exportActions: UseExportReturn) {
  return render(
    <I18nTestWrapper>
      <ExportToolbar resultCount={resultCount} exportActions={exportActions} />
    </I18nTestWrapper>
  );
}

beforeEach(() => {
  setupTestI18n('en');
});

describe('ExportToolbar', () => {
  it('正しく描画される', () => {
    const actions = createMockActions();
    renderToolbar(10, actions);
    // Export ボタンが存在する
    expect(screen.getByRole('button', { name: /export/i })).toBeDefined();
  });

  it('データ 0 件のとき Export ボタンが disabled', () => {
    const actions = createMockActions();
    renderToolbar(0, actions);
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('ドロップダウン展開でメニューが表示される', async () => {
    const user = userEvent.setup();
    const actions = createMockActions();
    renderToolbar(10, actions);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    expect(screen.getByText(/download as csv/i)).toBeDefined();
    expect(screen.getByText(/download as json/i)).toBeDefined();
    expect(screen.getByText(/copy to clipboard/i)).toBeDefined();
  });

  it('CSV メニュー項目クリックで downloadCsv が呼ばれる', async () => {
    const user = userEvent.setup();
    const actions = createMockActions();
    renderToolbar(10, actions);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText(/download as csv/i));

    expect(actions.downloadCsv).toHaveBeenCalledOnce();
  });

  it('JSON メニュー項目クリックで downloadJson が呼ばれる', async () => {
    const user = userEvent.setup();
    const actions = createMockActions();
    renderToolbar(10, actions);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText(/download as json/i));

    expect(actions.downloadJson).toHaveBeenCalledOnce();
  });

  it('コピー項目クリックで copyTsv が呼ばれる', async () => {
    const user = userEvent.setup();
    const actions = createMockActions();
    renderToolbar(10, actions);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText(/copy to clipboard/i));

    expect(actions.copyTsv).toHaveBeenCalledOnce();
  });

  it('hasDetailColumns=false のとき詳細チェックボックスが表示されない', () => {
    const actions = createMockActions({ hasDetailColumns: false });
    renderToolbar(10, actions);
    expect(screen.queryByText(/include details/i)).toBeNull();
  });

  it('hasDetailColumns=true のとき詳細チェックボックスが表示される', () => {
    const actions = createMockActions({ hasDetailColumns: true });
    renderToolbar(10, actions);
    expect(screen.getByText(/include details/i)).toBeDefined();
  });
});
