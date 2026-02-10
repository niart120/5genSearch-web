import type { ReactElement } from 'react';
import { CATEGORIES } from '@/lib/navigation';
import { CATEGORY_LABELS } from '@/lib/navigation-labels';
import { useUiStore } from '@/stores/settings/ui';
import { cn } from '@/lib/utils';

function CategoryNav(): ReactElement {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setActiveCategory = useUiStore((s) => s.setActiveCategory);

  return (
    <nav
      aria-label="Category navigation"
      className="hidden h-10 shrink-0 items-center gap-1 border-b border-border px-4 lg:flex lg:px-6"
    >
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
  );
}

export { CategoryNav };
