import type { ReactElement } from 'react';
import { Search, ListOrdered, Wrench } from 'lucide-react';
import { CATEGORIES } from '@/lib/navigation';
import type { Category } from '@/lib/navigation';
import { CATEGORY_LABELS } from '@/lib/navigation-labels';
import { useUiStore } from '@/stores/settings/ui';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<Category, ReactElement> = {
  search: <Search className="size-5" />,
  generation: <ListOrdered className="size-5" />,
  tools: <Wrench className="size-5" />,
};

function BottomNav(): ReactElement {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setActiveCategory = useUiStore((s) => s.setActiveCategory);

  return (
    <nav
      aria-label="Category navigation"
      className="flex h-14 shrink-0 items-center justify-around border-t border-border lg:hidden"
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
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {CATEGORY_ICONS[cat.id]}
            <span className="text-[10px] font-medium leading-tight">
              <Label />
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export { BottomNav };
