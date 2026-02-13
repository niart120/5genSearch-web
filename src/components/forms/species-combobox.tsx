/**
 * 種族選択 Combobox
 *
 * cmdk + Radix Popover による検索付きドロップダウン。
 * 全649種のポケモン名を WASM (`get_species_name`) から取得し、
 * インクリメンタル検索で絞り込める。
 */

import { useState, useMemo, type ReactElement } from 'react';
import { useLingui } from '@lingui/react/macro';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { get_species_name } from '@/wasm/wasm_pkg.js';
import { useUiStore } from '@/stores/settings/ui';

/** 全種族数 (Gen 5 まで) */
const SPECIES_COUNT = 649;

interface SpeciesOption {
  readonly id: number;
  /** "#001 フシギダネ" 形式のラベル */
  readonly label: string;
  /** 検索用: 番号 + 名前 (ローカライズ済み) */
  readonly searchValue: string;
}

interface SpeciesComboboxProps {
  value: number | undefined;
  onChange: (speciesId: number | undefined) => void;
  disabled?: boolean;
}

function SpeciesCombobox({ value, onChange, disabled }: SpeciesComboboxProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const options = useMemo<SpeciesOption[]>(
    () =>
      Array.from({ length: SPECIES_COUNT }, (_, i) => {
        const id = i + 1;
        const name = get_species_name(id, language);
        const idStr = id.toString().padStart(3, '0');
        return {
          id,
          label: `#${idStr} ${name}`,
          searchValue: `${idStr} ${id} ${name}`,
        };
      }),
    [language]
  );

  // 現在選択中のラベル
  const selectedLabel = useMemo(() => options.find((o) => o.id === value)?.label, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs font-normal"
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel ?? t`Not specified`}</span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t`Search species...`} />
          <CommandList>
            <CommandEmpty>{t`No species found`}</CommandEmpty>
            {/* 指定なしオプション */}
            <CommandItem
              value="__none__"
              onSelect={() => {
                // eslint-disable-next-line unicorn/no-useless-undefined -- 明示的に undefined を渡してリセット
                onChange(undefined);
                setOpen(false);
              }}
            >
              <Check
                className={cn('mr-2 size-3.5', value === undefined ? 'opacity-100' : 'opacity-0')}
              />
              {t`Not specified`}
            </CommandItem>
            {/* 種族リスト */}
            {options.map((opt) => (
              <CommandItem
                key={opt.id}
                value={opt.searchValue}
                onSelect={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('mr-2 size-3.5', value === opt.id ? 'opacity-100' : 'opacity-0')}
                />
                {opt.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { SpeciesCombobox };
export type { SpeciesComboboxProps };
