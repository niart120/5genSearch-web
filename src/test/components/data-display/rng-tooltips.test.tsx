import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from '@lingui/core';
import { I18nTestWrapper } from '@/test/helpers/i18n';
import { messages as ja } from '@/i18n/locales/ja/messages';
import { messages as en } from '@/i18n/locales/en/messages';
import {
  AdvanceTooltip,
  AdvanceRangeTooltip,
  NpcTooltip,
  NeedleInputTooltip,
  NeedleTooltip,
  NeedleResultAdvanceTooltip,
} from '@/components/data-display/rng-tooltips';
import { DataTable } from '@/components/data-display/data-table';
import { createNeedleResultColumns } from '@/features/needle/components/needle-result-columns';

const cases = [
  [
    AdvanceTooltip,
    'The number of RNG advances excluding the startup offset.',
    'オフセットを除いた乱数消費数を表します。',
  ],
  [
    AdvanceRangeTooltip,
    'Sets the range of advances to search or generate. The startup offset is not included.',
    '検索・個体生成の対象とする消費数の範囲を指定します。オフセットは含みません。',
  ],
  [
    NpcTooltip,
    'Generates results accounting for RNG advances between leaving the Day Care and speaking to the Day-Care Man.',
    '小屋を出て育て屋翁に話しかけるまでの消費を考慮した生成を行います。',
  ],
  [
    NeedleInputTooltip,
    'Enter the initial needle direction for each save in the order observed. Directions are numbered clockwise from 0 to 7, with 0 pointing up.',
    'レポートを書き始めたときの針の向きを、確認した順に入力します。上を0として時計回りに0〜7で表します。',
  ],
  [
    NeedleTooltip,
    'The needle direction shown when saving at this advance.',
    'この消費数でレポートを書いた場合に表示される針の向きを表します。',
  ],
  [
    NeedleResultAdvanceTooltip,
    'The advance corresponding to the last needle in the entered sequence.',
    '入力した針の並びのうち、最後の針に対応する消費数を表します。',
  ],
] as const;

describe.each(['en', 'ja'] as const)('RNG explanations in %s', (locale) => {
  it.each(cases)(
    '%s opens on focus and click, and closes on Escape and outside interaction',
    async (Component, english, japanese) => {
      i18n.load({ en, ja });
      i18n.activate(locale);
      const user = userEvent.setup();
      render(
        <I18nTestWrapper>
          <Component />
          <button type="button">Outside</button>
        </I18nTestWrapper>
      );
      await user.tab();
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        locale === 'ja' ? japanese : english
      );
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      await user.click(screen.getAllByRole('button')[0]);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Outside' }));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    }
  );
});

it('針読みの説明をクリックしても並べ替えを変更しない', async () => {
  i18n.load('en', en);
  i18n.activate('en');
  const user = userEvent.setup();
  render(
    <I18nTestWrapper>
      <DataTable
        columns={createNeedleResultColumns()}
        data={[{ advance: 100, source: { Seed: { base_seed: 1n, mt_seed: 1 } } }]}
        initialSorting={[{ id: 'advance', desc: false }]}
      />
    </I18nTestWrapper>
  );
  const header = screen.getByRole('columnheader', { name: /Advance/ });
  await user.click(screen.getByRole('button', { name: 'About needle search advances' }));
  expect(header.querySelector('.lucide-arrow-up')).toBeInTheDocument();
});
