import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EggMarginTooltip } from '@/components/data-display/egg-margin-tooltip';
import { DataTable } from '@/components/data-display/data-table';
import { createEggResultColumns } from '@/features/egg-search/components/egg-result-columns';
import { createEggSearchResultView } from '@/test/helpers/egg-result-view';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

describe('EggMarginTooltip', () => {
  beforeEach(() => setupTestI18n('en'));

  it('キーボードで説明を開き、Escapeで閉じられる', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <EggMarginTooltip />
      </I18nTestWrapper>
    );

    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('still receive the same Egg');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('説明をクリックしてもテーブルの並べ替えを変更しない', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <DataTable
          columns={createEggResultColumns('en')}
          data={[createEggSearchResultView()]}
          initialSorting={[{ id: 'margin', desc: false }]}
        />
      </I18nTestWrapper>
    );
    const header = screen.getByRole('columnheader', { name: /Margin/ });
    expect(header.querySelector('.lucide-arrow-up')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'About margin frames' }));

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(header.querySelector('.lucide-arrow-up')).toBeInTheDocument();
  });
});
