import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom 環境では WASM をロードできないため、値 import をモックする
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: vi.fn(() => 'Bulbasaur'),
}));

import { EggParamsForm } from '@/components/forms/egg-params-form';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { EggGenerationParams, Ivs } from '@/wasm/wasm_pkg.js';

const DEFAULT_IVS: Ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const DEFAULT_EGG_PARAMS: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_ability_slot: 'First',
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

/** functional updater を取り出して base に適用し結果を返す */
function applyLastUpdate<T>(mock: ReturnType<typeof vi.fn>, base: T): T {
  const arg = mock.mock.lastCall?.[0] as ((prev: T) => T) | T;
  return typeof arg === 'function' ? (arg as (prev: T) => T)(base) : arg;
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
    expect(screen.getByText('Uses Ditto')).toBeInTheDocument();
    expect(screen.getByText('Nidoran♀')).toBeInTheDocument();
    expect(screen.getByText('Masuda Method')).toBeInTheDocument();
    expect(screen.getByText('Consider NPC')).toBeInTheDocument();
  });

  it('♀親の特性セレクトが表示される', () => {
    renderForm();
    expect(screen.getByText('♀ parent ability')).toBeInTheDocument();
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
      expect(onChange).toHaveBeenCalled();
      const result = applyLastUpdate(onChange, DEFAULT_EGG_PARAMS);
      expect(result).toEqual(expect.objectContaining({ masuda_method: true }));
    }
  });

  it('親個体値の入力フィールドが表示される', () => {
    renderForm();
    expect(screen.getByText('Parent ♂ IVs')).toBeInTheDocument();
    expect(screen.getByText('Parent ♀ IVs')).toBeInTheDocument();
  });

  it('親個体値の ? チェックボックスが表示される', () => {
    renderForm();
    // 各親で 6 stat = 12 個の unknown チェックボックス + 4 個のフラグチェックボックス
    const unknownCheckboxes = screen.getAllByRole('checkbox', { name: /unknown/ });
    expect(unknownCheckboxes).toHaveLength(12);
  });

  it('? チェックボックス ON で IV が IV_VALUE_UNKNOWN (32) になる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderForm({ onChange });

    const hpUnknown = screen.getByRole('checkbox', { name: 'Parent ♂ IVs H unknown' });
    await user.click(hpUnknown);

    expect(onChange).toHaveBeenCalled();
    const result = applyLastUpdate(onChange, DEFAULT_EGG_PARAMS);
    expect(result).toEqual(
      expect.objectContaining({
        parent_male: expect.objectContaining({ hp: 32 }),
      })
    );
  });

  it('? チェックボックス OFF で IV が 0 に戻る', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const paramsWithUnknown = {
      ...DEFAULT_EGG_PARAMS,
      parent_male: { ...DEFAULT_IVS, hp: 32 },
    };
    renderForm({ value: paramsWithUnknown, onChange });

    const hpUnknown = screen.getByRole('checkbox', { name: 'Parent ♂ IVs H unknown' });
    await user.click(hpUnknown);

    expect(onChange).toHaveBeenCalled();
    const result = applyLastUpdate(onChange, paramsWithUnknown);
    expect(result).toEqual(
      expect.objectContaining({
        parent_male: expect.objectContaining({ hp: 0 }),
      })
    );
  });

  it('? チェックボックス ON で入力フィールドが disabled になる', () => {
    const paramsWithUnknown = {
      ...DEFAULT_EGG_PARAMS,
      parent_male: { ...DEFAULT_IVS, hp: 32 },
    };
    renderForm({ value: paramsWithUnknown });

    const hpInput = screen.getByRole('textbox', { name: 'Parent ♂ IVs H' });
    expect(hpInput).toBeDisabled();
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

    expect(onGenConfigChange).toHaveBeenCalled();
    const result = applyLastUpdate(onGenConfigChange, DEFAULT_GEN_CONFIG);
    expect(result).toEqual(expect.objectContaining({ user_offset: 10 }));
  });
});
