import { Trans } from '@lingui/react/macro';

interface EmptyStateProps {
  /** 表示メッセージ (省略時はデフォルトメッセージ) */
  message?: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message ?? <Trans>No results</Trans>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
