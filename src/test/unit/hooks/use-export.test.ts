import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { ExportColumn } from '@/services/export';

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
});
