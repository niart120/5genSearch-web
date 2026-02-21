import { Trans } from '@lingui/react/macro';
import { Menu } from 'lucide-react';
import { CATEGORIES } from '@/lib/navigation';
import { CATEGORY_LABELS } from './navigation-labels';
import { useUiStore } from '@/stores/settings/ui';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';

interface HeaderProps {
  onMenuClick?: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setActiveCategory = useUiStore((s) => s.setActiveCategory);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      {/* 左: ハンバーガー (モバイルのみ) + ブランド名 */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        )}
        <img src="/icon.png" alt="" className="size-7 lg:size-8" aria-hidden="true" />
        <h1 className="text-base font-semibold">
          <Trans>5genSearch-web</Trans>
        </h1>
      </div>

      {/* 中央: カテゴリナビゲーション (PC のみ) */}
      <nav aria-label="Category navigation" className="hidden items-center gap-1 lg:flex">
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategory;
          const Label = CATEGORY_LABELS[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'inline-flex h-8 items-center rounded-sm px-3 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              )}
            >
              <Label />
            </button>
          );
        })}
      </nav>

      {/* 右: ユーティリティ */}
      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

export { Header };
export type { HeaderProps };
