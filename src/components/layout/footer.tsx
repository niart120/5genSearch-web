import { Trans } from '@lingui/react/macro';

function Footer() {
  return (
    <footer className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
      <p>
        <Trans id="footer.encounterData">
          エンカウントデータの出典:{' '}
          <a
            href="https://pokebook.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            ポケモンの友
          </a>
        </Trans>
      </p>
    </footer>
  );
}

export { Footer };
