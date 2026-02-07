import { Trans } from '@lingui/react/macro';
import { ThemeToggle } from './theme-toggle';

function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      <h1 className="text-sm font-medium">
        <Trans>5genSearch</Trans>
      </h1>
      <ThemeToggle />
    </header>
  );
}

export { Header };
