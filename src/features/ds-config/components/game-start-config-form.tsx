import { Trans, useLingui } from '@lingui/react/macro';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { START_MODE_ORDER, getStartModeName } from '@/lib/game-data-names';
import { useUiStore } from '@/stores/settings/ui';
import type { StartMode } from '@/wasm/wasm_pkg';

function GameStartConfigForm() {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const isBw2 = useDsConfigStore(
    (s) => s.config.version === 'Black2' || s.config.version === 'White2'
  );
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const setGameStart = useDsConfigStore((s) => s.setGameStart);

  return (
    <div className="space-y-3">
      {/* StartMode */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Start mode</Trans>
        </Label>
        <Select
          value={gameStart.start_mode}
          onValueChange={(v: StartMode) => setGameStart({ start_mode: v })}
        >
          <SelectTrigger aria-label={t`Start mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {START_MODE_ORDER.map((m) => (
              <SelectItem key={m} value={m}>
                {getStartModeName(m, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Save presence */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="save-presence"
          checked={gameStart.save === 'WithSave'}
          onCheckedChange={(checked) =>
            setGameStart({
              save: checked ? 'WithSave' : 'NoSave',
              ...(checked ? {} : { memory_link: 'Disabled' as const }),
            })
          }
          disabled={gameStart.start_mode === 'Continue'}
          aria-label={t`With save`}
        />
        <Label htmlFor="save-presence" className="text-xs">
          <Trans>With save</Trans>
        </Label>
      </div>

      {/* Memory Link (BW2 only) */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="memory-link"
          checked={gameStart.memory_link === 'Enabled'}
          onCheckedChange={(checked) =>
            setGameStart({
              memory_link: checked ? 'Enabled' : 'Disabled',
            })
          }
          disabled={!isBw2 || gameStart.save === 'NoSave'}
          aria-label={t`Memory Link`}
        />
        <Label htmlFor="memory-link" className="text-xs">
          <Trans>Memory Link</Trans>
        </Label>
      </div>

      {/* Shiny Charm (BW2 only) */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="shiny-charm"
          checked={gameStart.shiny_charm === 'Obtained'}
          onCheckedChange={(checked) =>
            setGameStart({
              shiny_charm: checked ? 'Obtained' : 'NotObtained',
            })
          }
          disabled={!isBw2}
          aria-label={t`Shiny Charm`}
        />
        <Label htmlFor="shiny-charm" className="text-xs">
          <Trans>Shiny Charm</Trans>
        </Label>
      </div>
    </div>
  );
}

export { GameStartConfigForm };
