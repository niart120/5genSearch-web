import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';
import { DsConfigForm } from '@/features/ds-config/components/ds-config-form';
import { GameStartConfigForm } from '@/features/ds-config/components/game-start-config-form';

function renderDsConfigForm() {
  return render(
    <I18nTestWrapper>
      <DsConfigForm />
    </I18nTestWrapper>
  );
}

function renderGameStartForm() {
  return render(
    <I18nTestWrapper>
      <GameStartConfigForm />
    </I18nTestWrapper>
  );
}

beforeEach(() => {
  setupTestI18n('en');
  localStorage.clear();
  useDsConfigStore.setState(getDsConfigInitialState());
  useUiStore.setState({ ...getUiInitialState(), language: 'en' });
});

describe('DsConfigForm', () => {
  it('初期状態で各 Select が表示される', () => {
    renderDsConfigForm();

    expect(screen.getByLabelText('Version')).toBeInTheDocument();
    expect(screen.getByLabelText('Region')).toBeInTheDocument();
    expect(screen.getByLabelText('Hardware')).toBeInTheDocument();
  });

  it('Timer0/VCount が Auto モードで disabled', () => {
    renderDsConfigForm();

    const timer0MinInput = screen.getByLabelText('Timer0 min');
    expect(timer0MinInput).toBeDisabled();
  });

  it('Auto チェック解除で Timer0/VCount が編集可能になる', async () => {
    const user = userEvent.setup();
    renderDsConfigForm();

    const autoCheckbox = screen.getByLabelText('Auto');
    await user.click(autoCheckbox);

    const timer0MinInput = screen.getByLabelText('Timer0 min');
    expect(timer0MinInput).not.toBeDisabled();
  });

  it('MAC アドレス入力が表示される', () => {
    renderDsConfigForm();

    expect(screen.getByLabelText('MAC byte 1')).toBeInTheDocument();
  });

  it('初期値の Timer0/VCount が正しく表示される', () => {
    renderDsConfigForm();

    expect(screen.getByLabelText('Timer0 min')).toHaveValue('0C79');
    expect(screen.getByLabelText('Timer0 max')).toHaveValue('0C7A');
    expect(screen.getByLabelText('VCount min')).toHaveValue('60');
    expect(screen.getByLabelText('VCount max')).toHaveValue('60');
  });

  it('Version 変更 (Auto) で Timer0/VCount 範囲が自動更新される', () => {
    renderDsConfigForm();

    // Act: Store アクション経由で version 変更 → auto-lookup 発火
    act(() => {
      useDsConfigStore.getState().setConfig({ version: 'White' });
    });

    // DsLite/White/Jpn → timer0: 0x0C67-0x0C69, vcount: 0x5F
    expect(screen.getByLabelText('Timer0 min')).toHaveValue('0C67');
    expect(screen.getByLabelText('Timer0 max')).toHaveValue('0C69');
    expect(screen.getByLabelText('VCount min')).toHaveValue('5F');
    expect(screen.getByLabelText('VCount max')).toHaveValue('5F');
  });
});

describe('GameStartConfigForm', () => {
  it('BW 選択時に Shiny Charm が無効化される', () => {
    renderGameStartForm();

    const shinyCharm = screen.getByLabelText('Shiny Charm');
    expect(shinyCharm).toBeDisabled();
  });

  it('BW2 選択時に Shiny Charm が有効化される', () => {
    useDsConfigStore.setState({
      config: { ...getDsConfigInitialState().config, version: 'Black2' },
    });

    renderGameStartForm();

    const shinyCharm = screen.getByLabelText('Shiny Charm');
    expect(shinyCharm).not.toBeDisabled();
  });

  it('Save file / Memory Link / Shiny Charm スイッチが表示される', () => {
    renderGameStartForm();

    expect(screen.getByLabelText('Start mode')).toBeInTheDocument();
    expect(screen.getByLabelText('With save')).toBeInTheDocument();
    expect(screen.getByLabelText('Memory Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Shiny Charm')).toBeInTheDocument();
  });

  it('BW2→BW 切替で shiny_charm が NotObtained にリセットされ UI に反映される', () => {
    // Arrange: BW2 + shiny_charm=Obtained の状態を Store アクション経由で構築
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    useDsConfigStore.getState().setGameStart({ shiny_charm: 'Obtained' });

    renderGameStartForm();
    expect(screen.getByLabelText('Shiny Charm')).toBeChecked();

    // Act: setConfig で BW2→BW 切替 (リセットロジックが発火する)
    act(() => {
      useDsConfigStore.getState().setConfig({ version: 'Black' });
    });

    // Assert: shiny_charm が NotObtained にリセットされ、disabled + unchecked
    const shinyCharm = screen.getByLabelText('Shiny Charm');
    expect(shinyCharm).not.toBeChecked();
    expect(shinyCharm).toBeDisabled();
  });

  it('BW2→BW 切替で memory_link が Disabled にリセットされる', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    useDsConfigStore.getState().setGameStart({ memory_link: 'Enabled' });

    renderGameStartForm();

    act(() => {
      useDsConfigStore.getState().setConfig({ version: 'White' });
    });

    // Store 経由でリセットが反映されていることを確認
    const { gameStart } = useDsConfigStore.getState();
    expect(gameStart.memory_link).toBe('Disabled');
  });
});
