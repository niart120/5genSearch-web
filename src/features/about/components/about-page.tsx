import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';

const REPO_URL = 'https://github.com/niart120/5genSearch-web';

function AboutPage(): ReactElement {
  return (
    <div className="mx-auto max-w-2xl space-y-8 overflow-y-auto p-4">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>About this app</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            5genSearch is a tool for RNG manipulation in Pokemon Black / White / Black 2 / White 2.
          </Trans>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>Data sources</Trans>
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <a
              href="https://pokemon-otherwise.pokebook.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              pokebook.jp
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>License</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>This project is open source.</Trans>{' '}
          <a
            href={`${REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            LICENSE
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>Repository</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {REPO_URL}
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Trans>Disclaimer</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            This is an unofficial tool and is not affiliated with or endorsed by Nintendo, Game
            Freak, or The Pokemon Company.
          </Trans>
        </p>
      </section>
    </div>
  );
}

export { AboutPage };
