/**
 * DetailRow — 詳細ダイアログの行コンポーネント
 *
 * ラベル + 値 + コピーボタンを表示する共通コンポーネント。
 */

import { useCallback, type ReactElement, type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DetailRowProps {
  label: string;
  value: string;
  help?: ReactNode;
}

export function DetailRow({ label, value, help }: DetailRowProps): ReactElement {
  const { t } = useLingui();
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        {label}
        {help}
      </span>
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm">{value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleCopy}
          aria-label={t`Copy ${label}`}
        >
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}
