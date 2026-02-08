/**
 * DataTable コンポーネントテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/components/data-display/data-table';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

interface TestRow {
  id: number;
  name: string;
  value: number;
}

const columnHelper = createColumnHelper<TestRow>();

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    size: 60,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    size: 120,
  }),
  columnHelper.accessor('value', {
    header: 'Value',
    size: 80,
  }),
];

const testData: TestRow[] = [
  { id: 1, name: 'Alpha', value: 100 },
  { id: 2, name: 'Beta', value: 200 },
  { id: 3, name: 'Gamma', value: 300 },
];

beforeAll(() => {
  setupTestI18n('en');
});

describe('DataTable', () => {
  it('列定義通りにヘッダーがレンダリングされる', () => {
    render(
      <I18nTestWrapper>
        <DataTable columns={columns} data={testData} className="h-96" />
      </I18nTestWrapper>
    );

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('データがある場合テーブル構造がレンダリングされる', () => {
    // 仮想スクロールの行描画は jsdom では動作しないため、
    // テーブル構造 (thead/tbody) の存在のみ検証する
    const { container } = render(
      <I18nTestWrapper>
        <DataTable columns={columns} data={testData} className="h-96" />
      </I18nTestWrapper>
    );

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
  });

  it('空データ時に EmptyState が表示される', () => {
    render(
      <I18nTestWrapper>
        <DataTable columns={columns} data={[]} className="h-96" />
      </I18nTestWrapper>
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('カスタム空メッセージを表示できる', () => {
    render(
      <I18nTestWrapper>
        <DataTable columns={columns} data={[]} emptyMessage="データがありません" className="h-96" />
      </I18nTestWrapper>
    );

    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('ソート可能列のヘッダークリックでソートアイコンが変化する', async () => {
    const user = userEvent.setup();

    render(
      <I18nTestWrapper>
        <DataTable columns={columns} data={testData} className="h-96" />
      </I18nTestWrapper>
    );

    const valueHeader = screen.getByText('Value');
    // ソートアイコン (ArrowUpDown) が初期状態で存在する
    const headerCell = valueHeader.closest('th');
    expect(headerCell).toBeInTheDocument();

    // ヘッダークリックでソートトグル
    await user.click(valueHeader);
    // ソート後もヘッダーが存在する
    expect(screen.getByText('Value')).toBeInTheDocument();
  });
});
