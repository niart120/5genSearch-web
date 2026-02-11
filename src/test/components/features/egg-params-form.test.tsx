import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EggParamsForm } from '@/features/egg-search/components/egg-params-form';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { EggGenerationParams, Ivs } from '@/wasm/wasm_pkg.js';

const DEFAULT_IVS: Ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const DEFAULT_EGG_PARAMS: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_has_hidden: false,
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { ...DEFAULT_IVS },
  parent_female: { ...DEFAULT_IVS },
  consider_npc: false,
  species_id: undefined,
};

const DEFAULT_GEN_CONFIG = { user_offset: 0, max_advance: 100 };

function renderForm(props: Partial<Parameters<typeof EggParamsForm>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const onGenConfigChange = props.onGenConfigChange ?? vi.fn();
  return {
    onChange,
    onGenConfigChange,
    ...render(
      <I18nTestWrapper>
        <EggParamsForm
          value={DEFAULT_EGG_PARAMS}
          genConfig={DEFAULT_GEN_CONFIG}
          onChange={onChange}
          onGenConfigChange={onGenConfigChange}
          {...props}
        />
      </I18nTestWrapper>
    ),
  };
}

describe('EggParamsForm', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('折りたたみヘッダーが表示される', () => {
    renderForm();
    expect(screen.getByText('Egg parameters')).toBeInTheDocument();
  });

  it('チェックボックスが表示される', () => {
    renderForm();
    expect(screen.getByText('Female has HA')).toBeInTheDocument();
    expect(screen.getByText('Uses Ditto')).toBeInTheDocument();
    expect(screen.getByText('Nidoran♀')).toBeInTheDocument();
    expect(screen.getByText('Masuda Method')).toBeInTheDocument();
    expect(screen.getByText('Consider NPC')).toBeInTheDocument();
  });

  it('チェックボックス変更で onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderForm({ onChange });

    const masudaCheckbox = screen
      .getByText('Masuda Method')
      .closest('label')
      ?.querySelector('[role="checkbox"]');
    expect(masudaCheckbox).toBeDefined();
    if (masudaCheckbox) {
      await user.click(masudaCheckbox);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ masuda_method: true }));
    }
  });

  it('親個体値の入力フィールドが表示される', () => {
    renderForm();
    expect(screen.getByText('Parent ♂ IVs')).toBeInTheDocument();
    expect(screen.getByText('Parent ♀ IVs')).toBeInTheDocument();
  });

  it('offset / max_advance の入力フィールドが表示される', () => {
    renderForm();
    expect(screen.getByLabelText('Start offset')).toBeInTheDocument();
    expect(screen.getByLabelText('Max advance')).toBeInTheDocument();
  });

  it('offset 変更で onGenConfigChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onGenConfigChange = vi.fn();
    renderForm({ onGenConfigChange });

    const offsetInput = screen.getByLabelText('Start offset');
    await user.clear(offsetInput);
    await user.type(offsetInput, '10');
    await user.tab();

    expect(onGenConfigChange).toHaveBeenCalledWith(expect.objectContaining({ user_offset: 10 }));
  });
});
