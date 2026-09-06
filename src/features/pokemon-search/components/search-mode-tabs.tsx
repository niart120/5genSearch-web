import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePokemonSearchStore } from '../store';

export function SearchModeTabs({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useLingui();
  const mode = usePokemonSearchStore((state) => state.mode);
  const setMode = usePokemonSearchStore((state) => state.setModeFromTab);
  const focusRequested = usePokemonSearchStore((state) => state.modeFocusRequested);
  const tabsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // 方式別ページの再マウント後も矢印キーによる連続操作を維持する。
    if (focusRequested) {
      tabsRef.current?.querySelector<HTMLButtonElement>('[data-state="active"]')?.focus();
      usePokemonSearchStore.setState({ modeFocusRequested: false });
    }
  }, [focusRequested]);
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        if (!disabled && (value === 'iv' || value === 'pokemon')) setMode(value);
      }}
    >
      <TabsList
        ref={tabsRef}
        className="grid h-auto w-full grid-cols-2"
        aria-label={t`Search method`}
      >
        <TabsTrigger className="h-full whitespace-normal text-xs" value="iv" disabled={disabled}>
          <Trans>Search by MT Seed (IVs)</Trans>
        </TabsTrigger>
        <TabsTrigger
          className="h-full whitespace-normal text-xs"
          value="pokemon"
          disabled={disabled}
        >
          <Trans>Search by shininess / nature</Trans>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={mode} className="flex flex-col gap-4">
        {children}
      </TabsContent>
    </Tabs>
  );
}
