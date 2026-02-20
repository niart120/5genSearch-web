/**
 * ProfileSelector コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileSelector } from '@/features/ds-config/components/profile-selector';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useProfileStore, getProfileInitialState } from '@/stores/settings/profile';
import type { ProfileData } from '@/stores/settings/profile';

const MOCK_DATA: ProfileData = {
  config: {
    mac: [0, 9, 191, 42, 78, 210],
    hardware: 'DsLite',
    version: 'Black',
    region: 'Jpn',
  },
  ranges: [{ timer0_min: 3193, timer0_max: 3194, vcount_min: 96, vcount_max: 96 }],
  timer0Auto: true,
  gameStart: {
    start_mode: 'Continue',
    save: 'WithSave',
    memory_link: 'Disabled',
    shiny_charm: 'NotObtained',
  },
  tid: 12_345,
  sid: 54_321,
};

function renderSelector() {
  return render(
    <I18nTestWrapper>
      <ProfileSelector />
    </I18nTestWrapper>
  );
}

function resetStores() {
  localStorage.clear();
  useProfileStore.setState(getProfileInitialState());
}

describe('ProfileSelector', () => {
  beforeEach(() => {
    setupTestI18n('en');
    resetStores();
  });

  it('プロファイル一覧がドロップダウンに列挙される', async () => {
    // 事前にプロファイルを作成
    useProfileStore.getState().createProfile('My DS', MOCK_DATA);
    useProfileStore.getState().createProfile('Second DS', {
      ...MOCK_DATA,
      config: { ...MOCK_DATA.config, version: 'White' },
    });

    renderSelector();

    // アクティブプロファイル (Second DS) がトリガーに表示される
    const trigger = screen.getByRole('combobox', { name: /profile/i });
    expect(trigger).toHaveTextContent('Second DS');
  });

  it('新規作成フロー: 「Save as new」→ 名前入力 → プロファイル作成', async () => {
    const user = userEvent.setup();
    renderSelector();

    // 「Save as new」ボタンをクリック
    const newBtn = screen.getByRole('button', { name: /save as new/i });
    await user.click(newBtn);

    // ダイアログが表示される
    const input = await screen.findByLabelText(/profile name/i);
    expect(input).toBeDefined();

    // 名前を入力して保存
    await user.type(input, 'Test Profile');
    const saveBtn = screen.getByRole('button', { name: /^save$/i });

    // vi.fn で createProfile が実行されることを確認する代わりに
    // store 状態を検証
    await user.click(saveBtn);

    const { profiles } = useProfileStore.getState();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Test Profile');
  });
});
