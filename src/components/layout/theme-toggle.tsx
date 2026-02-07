import { Sun, Moon, Monitor } from 'lucide-react';
import { useUiSettings } from '@/hooks/use-ui-settings';

const THEME_CYCLE = ['light', 'dark', 'system'] as const;

function ThemeToggle() {
  const { theme, setTheme } = useUiSettings();

  const handleClick = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      <Icon className="size-4" />
    </button>
  );
}

export { ThemeToggle };
