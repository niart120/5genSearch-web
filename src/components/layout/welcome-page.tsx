import { Trans } from '@lingui/react/macro';

function WelcomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md space-y-4 px-6 text-center">
        <h2 className="text-lg font-semibold">
          <Trans>5genSearch</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Pokemon BW/BW2 RNG seed search tool.</Trans>
        </p>
        <p className="text-xs text-muted-foreground lg:hidden">
          <Trans>Tap the menu icon at the top left to configure search settings.</Trans>
        </p>
      </div>
    </div>
  );
}

export { WelcomePage };
