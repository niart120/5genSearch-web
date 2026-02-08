import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

interface ResponsiveContainerProps {
  sidebarContent?: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function ResponsiveContainer({
  sidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  children,
}: ResponsiveContainerProps) {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-1 overflow-hidden">
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
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6">{children}</div>
      </main>
    </div>
  );
}

export { ResponsiveContainer };
export type { ResponsiveContainerProps };
