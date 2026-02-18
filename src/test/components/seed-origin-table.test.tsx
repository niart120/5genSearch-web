/**
 * SeedOriginTable コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedOriginTable } from '@/components/forms/seed-origin-table';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { SeedOrigin } from '@/wasm/wasm_pkg';

function renderTable(props: Partial<Parameters<typeof SeedOriginTable>[0]> = {}) {
  const onOriginsChange = props.onOriginsChange ?? vi.fn();
  return {
    onOriginsChange,
    ...render(
      <I18nTestWrapper>
        <SeedOriginTable
          origins={props.origins ?? []}
          onOriginsChange={onOriginsChange}
          disabled={props.disabled}
          editable={props.editable}
        />
      </I18nTestWrapper>
    ),
  };
}

const STARTUP_ORIGIN: SeedOrigin = {
  Startup: {
    base_seed: 0x01_23_45_67_89_ab_cd_efn,
    mt_seed: 0x89_ab_cd_ef,
    datetime: { year: 2025, month: 1, day: 5, hour: 9, minute: 3, second: 7 },
    condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x2f_ff },
  },
};

const SEED_ORIGIN: SeedOrigin = {
  Seed: {
    base_seed: 0xab_cd_ef_01_23_45_67_89n,
    mt_seed: 0x23_45_67_89,
  },
};

describe('SeedOriginTable', () => {
  beforeEach(() => {
    setupTestI18n('en');
  });

  it('origins が空の場合 "No seeds loaded" を表示する', () => {
    renderTable({ origins: [] });
    expect(screen.getByText('No seeds loaded')).toBeDefined();
  });

  it('Startup バリアントの SeedOrigin を正しく表示する', () => {
    renderTable({ origins: [STARTUP_ORIGIN] });

    // テーブルが描画される
    const table = screen.getByRole('table');
    expect(table).toBeDefined();

    // Base Seed が表示される
    expect(screen.getByText('0123456789ABCDEF')).toBeDefined();
    // MT Seed が表示される
    expect(screen.getByText('89ABCDEF')).toBeDefined();
    // Datetime が表示される
    expect(screen.getByText('2025/01/05 09:03:07')).toBeDefined();
    // Timer0 が表示される
    expect(screen.getByText('0600')).toBeDefined();
    // VCount が表示される
    expect(screen.getByText('5E')).toBeDefined();
  });

  it('Seed バリアントの SeedOrigin を正しく表示する', () => {
    renderTable({ origins: [SEED_ORIGIN] });

    expect(screen.getByText('ABCDEF0123456789')).toBeDefined();
    expect(screen.getByText('23456789')).toBeDefined();
  });

  it('複数行を表示する', () => {
    renderTable({ origins: [STARTUP_ORIGIN, STARTUP_ORIGIN] });

    const rows = screen.getAllByRole('row');
    // ヘッダ行 + データ行 2 つ
    expect(rows.length).toBe(3);
  });

  it('行削除ボタンで onOriginsChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const origins = [STARTUP_ORIGIN, SEED_ORIGIN];
    const { onOriginsChange } = renderTable({ origins });

    // 1 行目の削除ボタン
    const deleteBtn = screen.getByLabelText('Delete row 1');
    await user.click(deleteBtn);

    expect(onOriginsChange).toHaveBeenCalledWith([SEED_ORIGIN]);
  });

  it('Clear all ボタンで全行削除される', async () => {
    const user = userEvent.setup();
    const { onOriginsChange } = renderTable({ origins: [STARTUP_ORIGIN, SEED_ORIGIN] });

    const clearBtn = screen.getByText('Clear all');
    await user.click(clearBtn);

    expect(onOriginsChange).toHaveBeenCalledWith([]);
  });

  it('editable=false の場合、削除ボタンが表示されない', () => {
    renderTable({ origins: [STARTUP_ORIGIN], editable: false });

    expect(screen.queryByLabelText('Delete row 1')).toBeNull();
    expect(screen.queryByText('Clear all')).toBeNull();
  });

  it('disabled=true の場合、削除ボタンが表示されない', () => {
    renderTable({ origins: [STARTUP_ORIGIN], disabled: true });

    expect(screen.queryByLabelText('Delete row 1')).toBeNull();
    expect(screen.queryByText('Clear all')).toBeNull();
  });

  it('Startup と Seed が混在する場合、Startup カラムを表示し Seed 行は "-" を表示する', () => {
    renderTable({ origins: [STARTUP_ORIGIN, SEED_ORIGIN] });

    // Startup 行のデータが表示される
    expect(screen.getByText('2025/01/05 09:03:07')).toBeDefined();
    expect(screen.getByText('0600')).toBeDefined();

    // 両方の Base Seed が表示される
    expect(screen.getByText('0123456789ABCDEF')).toBeDefined();
    expect(screen.getByText('ABCDEF0123456789')).toBeDefined();

    // Seed 行の Startup 専用カラムは '-' が表示される
    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThanOrEqual(4); // datetime, timer0, vcount, key_code
  });
});
