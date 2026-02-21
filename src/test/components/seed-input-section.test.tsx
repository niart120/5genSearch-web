/**
 * SeedInputSection コンポーネントテスト
 *
 * WASM 依存の resolveSeedOrigins をモックし、
 * タブ表示・pendingDetailOrigin / pendingSeedOrigins の自動消費・
 * タブ別 origins 独立保持をテストする。
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SeedInputSection, type SeedInputMode } from '@/components/forms/seed-input-section';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { getSearchResultsInitialState, useSearchResultsStore } from '@/stores/search/results';
import type { SeedOrigin } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockResolveSeedOrigins = vi.fn((): SeedOrigin[] => []);
vi.mock('@/services/seed-resolve', () => ({
  resolveSeedOrigins: (...args: unknown[]) =>
    (mockResolveSeedOrigins as (...args: unknown[]) => SeedOrigin[])(...args),
}));

// parseSerializedSeedOrigins
vi.mock('@/services/seed-origin-serde', () => ({
  parseSerializedSeedOrigins: vi.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSection(
  overrides: Partial<{
    mode: 'import' | 'manual-seeds' | 'manual-startup';
    onModeChange: Mock;
    origins: SeedOrigin[];
    onOriginsChange: Mock;
    disabled: boolean;
    featureId: 'pokemon-list' | 'egg-list' | 'needle';
  }> = {}
) {
  const onModeChange = overrides.onModeChange ?? vi.fn();
  const onOriginsChange = overrides.onOriginsChange ?? vi.fn();
  return {
    onModeChange,
    onOriginsChange,
    ...render(
      <I18nTestWrapper>
        <SeedInputSection
          featureId={overrides.featureId ?? 'pokemon-list'}
          mode={overrides.mode ?? 'manual-startup'}
          onModeChange={onModeChange}
          origins={overrides.origins ?? []}
          onOriginsChange={onOriginsChange}
          disabled={overrides.disabled}
        />
      </I18nTestWrapper>
    ),
  };
}

/** mode を内部で管理するラッパー。タブクリックで実際に切り替わる */
function StatefulWrapper({
  initialMode = 'manual-startup',
  featureId = 'pokemon-list' as const,
  onModeChangeSpy,
  onOriginsChangeSpy,
}: {
  initialMode?: SeedInputMode;
  featureId?: 'pokemon-list' | 'egg-list' | 'needle';
  onModeChangeSpy?: Mock;
  onOriginsChangeSpy?: Mock;
}) {
  const [mode, setMode] = useState<SeedInputMode>(initialMode);
  const [origins, setOrigins] = useState<SeedOrigin[]>([]);
  return (
    <I18nTestWrapper>
      <SeedInputSection
        featureId={featureId}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          onModeChangeSpy?.(m);
        }}
        origins={origins}
        onOriginsChange={(o) => {
          setOrigins(o);
          onOriginsChangeSpy?.(o);
        }}
      />
    </I18nTestWrapper>
  );
}

const resetStore = () => {
  useSearchResultsStore.setState(getSearchResultsInitialState());
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STARTUP_ORIGINS: SeedOrigin[] = [
  {
    Startup: {
      base_seed: 0x11n,
      mt_seed: 0x11,
      datetime: { year: 2025, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
      condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0 },
    },
  },
];

const SEEDS_ORIGINS: SeedOrigin[] = [{ Seed: { base_seed: 0x22n, mt_seed: 0x22 } }];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SeedInputSection', () => {
  beforeEach(() => {
    setupTestI18n('en');
    resetStore();
    mockResolveSeedOrigins.mockReset().mockReturnValue([]);
  });

  // ---------------------------------------------------------------------------
  // タブ表示
  // ---------------------------------------------------------------------------

  it('3 つのタブ (Startup / Seeds / Import) が表示される', () => {
    renderSection();
    expect(screen.getByRole('tab', { name: /Startup/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Seeds/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Import/i })).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // タブ別 origins 独立保持
  // ---------------------------------------------------------------------------

  describe('タブ別 origins 独立保持', () => {
    it('Startup タブで解決後、Seeds タブに切り替えると Seeds の origins (空) が通知される', async () => {
      mockResolveSeedOrigins.mockReturnValue(STARTUP_ORIGINS);
      const onOriginsChangeSpy = vi.fn();
      render(<StatefulWrapper onOriginsChangeSpy={onOriginsChangeSpy} />);

      // 初回マウントで Startup が自動解決 → STARTUP_ORIGINS が通知
      expect(onOriginsChangeSpy).toHaveBeenCalledWith(STARTUP_ORIGINS);

      const user = userEvent.setup();
      onOriginsChangeSpy.mockClear();

      // Seeds タブに切り替え → seedsOrigins (空) が通知
      await user.click(screen.getByRole('tab', { name: /Seeds/i }));
      expect(onOriginsChangeSpy).toHaveBeenCalledWith([]);
    });

    it('Startup タブで解決後 → Seeds → Startup に戻ると startupOrigins が再通知される', async () => {
      mockResolveSeedOrigins.mockReturnValue(STARTUP_ORIGINS);
      const onOriginsChangeSpy = vi.fn();
      render(<StatefulWrapper onOriginsChangeSpy={onOriginsChangeSpy} />);

      const user = userEvent.setup();

      // Seeds タブへ切り替え
      await user.click(screen.getByRole('tab', { name: /Seeds/i }));
      onOriginsChangeSpy.mockClear();

      // Startup タブに戻る → startupOrigins が再通知
      await user.click(screen.getByRole('tab', { name: /Startup/i }));
      expect(onOriginsChangeSpy).toHaveBeenCalledWith(STARTUP_ORIGINS);
    });

    it('Seeds タブで解決後、Import タブに切り替えると importOrigins (空) が通知される', async () => {
      mockResolveSeedOrigins.mockReturnValue(SEEDS_ORIGINS);
      const onOriginsChangeSpy = vi.fn();
      render(
        <StatefulWrapper initialMode="manual-seeds" onOriginsChangeSpy={onOriginsChangeSpy} />
      );

      const user = userEvent.setup();

      // Seeds タブで入力して解決
      const textarea = screen.getByPlaceholderText('0123456789ABCDEF') as HTMLTextAreaElement;
      await user.type(textarea, '0000000000000022');
      onOriginsChangeSpy.mockClear();

      // Import タブに切り替え → importOrigins (空) が通知
      await user.click(screen.getByRole('tab', { name: /Import/i }));
      expect(onOriginsChangeSpy).toHaveBeenCalledWith([]);
    });
  });

  // ---------------------------------------------------------------------------
  // pendingDetailOrigin の自動消費
  // ---------------------------------------------------------------------------

  describe('pendingDetailOrigin 自動消費', () => {
    it('Startup バリアントを消費すると manual-startup タブに切り替え、Seeds タブにも base_seed hex が反映される', async () => {
      const origin: SeedOrigin = {
        Startup: {
          base_seed: 0x01_23_45_67_89_ab_cd_efn,
          mt_seed: 0x89_ab_cd_ef,
          datetime: { year: 2025, month: 1, day: 5, hour: 12, minute: 0, second: 0 },
          condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x2f_ff },
        },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);

      const onModeChangeSpy = vi.fn();
      render(<StatefulWrapper onModeChangeSpy={onModeChangeSpy} />);

      // manual-startup に切り替えが呼ばれる
      expect(onModeChangeSpy).toHaveBeenCalledWith('manual-startup');
      // この consumer 分だけクリアされる
      expect(useSearchResultsStore.getState().pendingDetailOrigins['pokemon-list']).toBeUndefined();

      // Seeds タブに切り替えて base_seed hex がテキストに反映されていることを確認
      const user = userEvent.setup();
      const seedsTab = screen.getByRole('tab', { name: /Seeds/i });
      await user.click(seedsTab);

      const textarea = screen.getByPlaceholderText('0123456789ABCDEF') as HTMLTextAreaElement;
      expect(textarea.value).toBe('0123456789ABCDEF');
    });

    it('Startup バリアント消費で startupOrigins に resolve 結果がセットされる', () => {
      const resolvedOrigins: SeedOrigin[] = [
        {
          Startup: {
            base_seed: 0x01_23_45_67_89_ab_cd_efn,
            mt_seed: 0x89_ab_cd_ef,
            datetime: { year: 2025, month: 1, day: 5, hour: 12, minute: 0, second: 0 },
            condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x2f_ff },
          },
        },
      ];
      mockResolveSeedOrigins.mockReturnValue(resolvedOrigins);

      const origin: SeedOrigin = {
        Startup: {
          base_seed: 0x01_23_45_67_89_ab_cd_efn,
          mt_seed: 0x89_ab_cd_ef,
          datetime: { year: 2025, month: 1, day: 5, hour: 12, minute: 0, second: 0 },
          condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x2f_ff },
        },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);

      const onOriginsChangeSpy = vi.fn();
      render(<StatefulWrapper onOriginsChangeSpy={onOriginsChangeSpy} />);

      expect(onOriginsChangeSpy).toHaveBeenCalledWith(resolvedOrigins);
    });

    it('Seed バリアントを消費すると manual-seeds タブに切り替え、seedsOrigins にセットされる', () => {
      mockResolveSeedOrigins.mockReturnValue(SEEDS_ORIGINS);
      const origin: SeedOrigin = {
        Seed: {
          base_seed: 0xab_cd_ef_01_23_45_67_89n,
          mt_seed: 0x23_45_67_89,
        },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);

      const onModeChangeSpy = vi.fn();
      const onOriginsChangeSpy = vi.fn();
      render(
        <StatefulWrapper
          onModeChangeSpy={onModeChangeSpy}
          onOriginsChangeSpy={onOriginsChangeSpy}
        />
      );

      expect(onModeChangeSpy).toHaveBeenCalledWith('manual-seeds');
      expect(useSearchResultsStore.getState().pendingDetailOrigins['pokemon-list']).toBeUndefined();
      expect(onOriginsChangeSpy).toHaveBeenCalledWith(SEEDS_ORIGINS);
    });
  });

  // ---------------------------------------------------------------------------
  // pendingSeedOrigins の自動消費
  // ---------------------------------------------------------------------------

  describe('pendingSeedOrigins 自動消費', () => {
    it('データがあれば import タブに切り替え、importOrigins にセットされる', () => {
      const origins: SeedOrigin[] = [
        { Seed: { base_seed: 1n, mt_seed: 1 } },
        { Seed: { base_seed: 2n, mt_seed: 2 } },
      ];
      useSearchResultsStore.getState().setPendingSeedOrigins(origins);

      const { onModeChange, onOriginsChange } = renderSection();

      expect(onModeChange).toHaveBeenCalledWith('import');
      expect(onOriginsChange).toHaveBeenCalledWith(origins);
      expect(useSearchResultsStore.getState().pendingSeedOrigins).toEqual([]);
    });

    it('一括転記後に他タブに切り替えても importOrigins は保持される', async () => {
      const origins: SeedOrigin[] = [{ Seed: { base_seed: 1n, mt_seed: 1 } }];
      useSearchResultsStore.getState().setPendingSeedOrigins(origins);

      const onOriginsChangeSpy = vi.fn();
      render(<StatefulWrapper initialMode="import" onOriginsChangeSpy={onOriginsChangeSpy} />);

      // import タブに切り替わり importOrigins がセット
      expect(onOriginsChangeSpy).toHaveBeenCalledWith(origins);

      const user = userEvent.setup();
      onOriginsChangeSpy.mockClear();

      // Startup タブに切り替え → startupOrigins (空) が通知
      await user.click(screen.getByRole('tab', { name: /Startup/i }));
      expect(onOriginsChangeSpy).toHaveBeenCalledWith([]);

      onOriginsChangeSpy.mockClear();

      // Import タブに戻る → importOrigins が再通知
      await user.click(screen.getByRole('tab', { name: /Import/i }));
      expect(onOriginsChangeSpy).toHaveBeenCalledWith(origins);
    });
  });

  // ---------------------------------------------------------------------------
  // pendingDetailOrigin が pendingSeedOrigins より優先される
  // ---------------------------------------------------------------------------

  it('pendingDetailOrigin と pendingSeedOrigins が両方ある場合、pendingDetailOrigin が優先される', () => {
    const detail: SeedOrigin = {
      Seed: { base_seed: 0xabn, mt_seed: 0xab },
    };
    const bulk: SeedOrigin[] = [{ Seed: { base_seed: 1n, mt_seed: 1 } }];
    useSearchResultsStore.getState().setPendingDetailOrigin(detail);
    useSearchResultsStore.getState().setPendingSeedOrigins(bulk);

    const { onModeChange } = renderSection();

    // detail が優先 → manual-seeds
    expect(onModeChange).toHaveBeenCalledWith('manual-seeds');
    expect(useSearchResultsStore.getState().pendingDetailOrigins['pokemon-list']).toBeUndefined();
    // bulk は消費されない (detail が先に return した)
    expect(useSearchResultsStore.getState().pendingSeedOrigins).toEqual(bulk);
  });

  // ---------------------------------------------------------------------------
  // pending が空の場合
  // ---------------------------------------------------------------------------

  it('pending データがない場合は onModeChange が初期タブ設定のまま呼ばれない', () => {
    const { onModeChange } = renderSection({ mode: 'manual-startup' });

    // onModeChange は初期消費による切り替えがなければ呼ばれない
    // (autoResolveStartup は呼ばれるが onModeChange は呼ばれない)
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
