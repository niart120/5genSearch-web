import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { cn } from '@/lib/utils';

interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

function Sidebar({ children, className }: SidebarProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">
          <Trans>Settings</Trans>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

export { Sidebar };
export type { SidebarProps };
