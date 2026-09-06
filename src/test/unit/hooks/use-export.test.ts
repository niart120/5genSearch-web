import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { ExportColumn } from '@/services/export';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';

const { mockDownloadFile } = vi.hoisted(() => ({
  mockDownloadFile: vi.fn(),
}));

vi.mock('@/services/export', async () => {
  const actual = await vi.importActual<typeof import('@/services/export')>('@/services/export');
  return { ...actual, downloadFile: mockDownloadFile };
});

import { useExport } from '@/hooks/use-export';

interface TestRow {
  value: string;
}

const TEST_COLUMNS: ExportColumn<TestRow>[] = [
  { key: 'value', header: 'Value', accessor: (row) => row.value },
];

describe('useExport result version context', () => {
  beforeEach(() => {
    localStorage.clear();
    useDsConfigStore.getState().reset();
    setupTestI18n('ja');
    mockDownloadFile.mockReset();
  });

  it('生成時バージョンをファイル名とJSONメタデータへ使用する', () => {
    expect(useDsConfigStore.getState().config.version).toBe('Black');
    const { result } = renderHook(
      () =>
        useExport({
          data: [{ value: 'result' }],
          columns: TEST_COLUMNS,
          featureId: 'pokemon-list',
          versionOverride: 'Black2',
        }),
      { wrapper: I18nTestWrapper }
    );

    act(() => result.current.downloadJson());

    expect(mockDownloadFile).toHaveBeenCalledOnce();
    const [content, filename] = mockDownloadFile.mock.calls[0] as [string, string, string];
    expect(filename).toMatch(/_b2_jpn_/);
    expect(JSON.parse(content).meta.dsConfig.version).toBe('Black2');
  });

  it('日時検索のJSONは共通設定を変更しても検索時の本体設定と起動範囲を保持する', () => {
    const request = createPokemonSearchRequest();
    const { result } = renderHook(
      () =>
        useExport({
          data: [{ value: 'result' }],
          columns: TEST_COLUMNS,
          featureId: 'pokemon-search',
          contextOverride: request.context,
          gameStartOverride: request.genConfig.game_start,
        }),
      { wrapper: I18nTestWrapper }
    );
    act(() =>
      useDsConfigStore.setState({
        config: { ...request.context.ds, version: 'White2', mac: [1, 2, 3, 4, 5, 6] },
        ranges: [],
      })
    );
    act(() => result.current.downloadJson());
    const content = String(mockDownloadFile.mock.calls[0][0]);
    const expected = JSON.parse(content);
    expect(expected.meta.dsConfig.version).toBe('Black');
    expect(expected.meta.dsConfig.macAddress).toBe('00:09:bf:12:34:56');
    expect(expected.meta.timer0VCountRanges).toEqual([
      { timer0Min: 3193, timer0Max: 3193, vcountMin: 96, vcountMax: 96 },
    ]);
  });
});
