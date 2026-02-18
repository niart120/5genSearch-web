/**
 * エクスポートツールバー
 *
 * テーブル上部に配置し、CSV/JSON ダウンロードおよびクリップボードコピーを提供する。
 * ロジックは useExport フックに委譲し、本コンポーネントは UI のみを担当する。
 */

import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { Download, ClipboardCopy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { UseExportReturn } from '@/hooks/use-export';

interface ExportToolbarProps {
  resultCount: number;
  exportActions: UseExportReturn;
}

function ExportToolbar({ resultCount, exportActions }: ExportToolbarProps): ReactElement {
  const {
    downloadCsv,
    downloadJson,
    copyTsv,
    includeDetails,
    setIncludeDetails,
    hasDetailColumns,
  } = exportActions;

  const isEmpty = resultCount === 0;

  return (
    <div className="flex items-center gap-3">
      {hasDetailColumns ? (
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="include-details"
            checked={includeDetails}
            onCheckedChange={(checked) => setIncludeDetails(checked === true)}
          />
          <Label htmlFor="include-details" className="text-xs text-muted-foreground">
            <Trans>Include details</Trans>
          </Label>
        </div>
      ) : undefined}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isEmpty}>
            <Trans>Export</Trans>
            <ChevronDown className="ml-1 size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={downloadCsv}>
            <Download className="mr-2 size-4" />
            <Trans>Download as CSV</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={downloadJson}>
            <Download className="mr-2 size-4" />
            <Trans>Download as JSON</Trans>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void copyTsv()}>
            <ClipboardCopy className="mr-2 size-4" />
            <Trans>Copy to clipboard</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { ExportToolbar };
export type { ExportToolbarProps };
