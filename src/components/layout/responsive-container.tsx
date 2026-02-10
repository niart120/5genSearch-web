import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

interface ResponsiveContainerProps {
  sidebarContent?: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  topContent?: ReactNode;
  children?: ReactNode;
}

function ResponsiveContainer({
  sidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  topContent,
  children,
}: ResponsiveContainerProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* PC: 固定 Sidebar */}
      {sidebarContent && (
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </aside>
      )}

      {/* モバイル: Sheet Sidebar */}
      {sidebarContent && (
        <Sheet open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
          <SheetContent side="left" className="w-4/5 max-w-xs p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>
                <Trans>Settings</Trans>
              </SheetTitle>
            </SheetHeader>
            <Sidebar>{sidebarContent}</Sidebar>
          </SheetContent>
        </Sheet>
      )}

      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {topContent && <div className="shrink-0">{topContent}</div>}
        <div className="flex-1 overflow-y-auto lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="px-4 py-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:px-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export { ResponsiveContainer };
export type { ResponsiveContainerProps };
