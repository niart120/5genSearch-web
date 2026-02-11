import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useTrainerStore, getTrainerInitialState } from '@/stores/settings/trainer';
import { TrainerConfigForm } from '@/features/ds-config/components/trainer-config-form';

function renderForm() {
  return render(
    <I18nTestWrapper>
      <TrainerConfigForm />
    </I18nTestWrapper>
  );
}

beforeEach(() => {
  setupTestI18n('en');
  localStorage.clear();
  useTrainerStore.setState(getTrainerInitialState());
});

describe('TrainerConfigForm', () => {
  it('初期状態で TID/SID フィールドが空欄', () => {
    renderForm();

    const tid = screen.getByLabelText('Trainer ID');
    const sid = screen.getByLabelText('Secret ID');
    expect(tid).toHaveDisplayValue('');
    expect(sid).toHaveDisplayValue('');
  });

  it('数値入力が Store に反映される', async () => {
    const user = userEvent.setup();
    renderForm();

    const tid = screen.getByLabelText('Trainer ID');
    await user.clear(tid);
    await user.type(tid, '12345');

    expect(useTrainerStore.getState().tid).toBe(12_345);
  });

  it('65536 入力が 65535 にクランプされる', async () => {
    const user = userEvent.setup();
    renderForm();

    const tid = screen.getByLabelText('Trainer ID');
    await user.clear(tid);
    await user.type(tid, '65536');

    expect(useTrainerStore.getState().tid).toBe(65_535);
  });

  it('空欄にすると undefined になる', async () => {
    const user = userEvent.setup();
    useTrainerStore.setState({ tid: 100 });
    renderForm();

    const tid = screen.getByLabelText('Trainer ID');
    await user.clear(tid);

    expect(useTrainerStore.getState().tid).toBeUndefined();
  });

  it('負数入力が 0 にクランプされる', async () => {
    const user = userEvent.setup();
    renderForm();

    const tid = screen.getByLabelText('Trainer ID');
    await user.clear(tid);
    await user.type(tid, '-5');

    expect(useTrainerStore.getState().tid).toBe(0);
  });

  it('SID も同様に入力・反映される', async () => {
    const user = userEvent.setup();
    renderForm();

    const sid = screen.getByLabelText('Secret ID');
    await user.clear(sid);
    await user.type(sid, '999');

    expect(useTrainerStore.getState().sid).toBe(999);
  });
});
