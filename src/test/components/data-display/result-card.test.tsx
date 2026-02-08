/**
 * ResultCardList コンポーネントテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultCardList } from '@/components/data-display/result-card';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

interface TestItem {
  id: number;
  name: string;
}

const testData: TestItem[] = [
  { id: 1, name: 'Item A' },
  { id: 2, name: 'Item B' },
  { id: 3, name: 'Item C' },
];

beforeAll(() => {
  setupTestI18n('en');
});

describe('ResultCardList', () => {
  it('データがある場合コンテナ構造がレンダリングされる', () => {
    // 仮想スクロールのアイテム描画は jsdom では動作しないため、
    // EmptyState が表示されないことを検証する
    const { container } = render(
      <I18nTestWrapper>
        <ResultCardList
          data={testData}
          renderCard={(item) => (
            <div className="rounded-sm border p-3" data-testid={`card-${item.id}`}>
              {item.name}
            </div>
          )}
          className="h-96"
        />
      </I18nTestWrapper>
    );

    expect(screen.queryByText('No results')).not.toBeInTheDocument();
    // スクロールコンテナが存在する
    expect(container.querySelector('.overflow-auto')).toBeInTheDocument();
  });

  it('空データ時に EmptyState が表示される', () => {
    render(
      <I18nTestWrapper>
        <ResultCardList data={[]} renderCard={() => <div />} className="h-96" />
      </I18nTestWrapper>
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('カスタム空メッセージを表示できる', () => {
    render(
      <I18nTestWrapper>
        <ResultCardList
          data={[]}
          renderCard={() => <div />}
          emptyMessage="カードがありません"
          className="h-96"
        />
      </I18nTestWrapper>
    );

    expect(screen.getByText('カードがありません')).toBeInTheDocument();
  });
});
