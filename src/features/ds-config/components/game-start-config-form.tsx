import { Trans, useLingui } from '@lingui/react/macro';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useUiStore } from '@/stores/settings/ui';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  START_MODE_ORDER,
  getStartModeName,
  SAVE_STATE_ORDER,
  getSaveStateName,
} from '@/lib/game-data-names';
import type { StartMode, SaveState } from '@/wasm/wasm_pkg';

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

      {/* SaveState */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Save state</Trans>
        </Label>
        <Select
          value={gameStart.save_state}
          onValueChange={(v: SaveState) => setGameStart({ save_state: v })}
        >
          <SelectTrigger aria-label={t`Save state`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAVE_STATE_ORDER.map((s) => (
              <SelectItem
                key={s}
                value={s}
                disabled={
                  (s === 'WithMemoryLink' && !isBw2) ||
                  (s === 'NoSave' && gameStart.start_mode === 'Continue')
                }
              >
                {getSaveStateName(s, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shiny Charm */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="shiny-charm"
          checked={gameStart.shiny_charm}
          onCheckedChange={(checked) => setGameStart({ shiny_charm: checked === true })}
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
