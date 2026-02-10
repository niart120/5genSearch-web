/**
 * FeaturePageLayout — Controls / Results 2 ペイン構成の Compound Component
 *
 * PC (lg+): 横並び 2 ペイン (Controls 固定幅 + Results 可変幅)
 * モバイル (< lg): 縦積み
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeaturePageLayoutProps {
  children: ReactNode;
  className?: string;
}

function FeaturePageLayout({ children, className }: FeaturePageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4 p-4 lg:min-h-0 lg:flex-1 lg:flex-row', className)}>
      {children}
    </div>
  );
}

interface PaneProps {
  children: ReactNode;
  className?: string;
}

function Controls({ children, className }: PaneProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto lg:pr-2',
        className
      )}
    >
      {children}
    </div>
  );
}

function Results({ children, className }: PaneProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-hidden', className)}>
      {children}
    </div>
  );
}

FeaturePageLayout.Controls = Controls;
FeaturePageLayout.Results = Results;

export { FeaturePageLayout };
