import { Trans, useLingui } from '@lingui/react/macro';
import { useDsConfig } from '@/hooks/use-ds-config';
import { useUiStore } from '@/stores/settings/ui';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MacAddressInput } from '@/components/forms/mac-address-input';
import {
  VERSION_ORDER,
  getVersionName,
  REGION_ORDER,
  getRegionName,
  HARDWARE_ORDER,
  getHardwareName,
} from '@/lib/game-data-names';
import { lookupDefaultRanges } from '@/data/timer0-vcount-defaults';
import { toast } from '@/components/ui/toast-state';
import { Timer0VCountSection } from './timer0-vcount-section';
import type { Hardware, RomVersion, RomRegion } from '@/wasm/wasm_pkg';

function DsConfigForm() {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const { config, setConfig, setRanges, timer0Auto, setTimer0Auto } = useDsConfig();

  const applyAutoRanges = (hw: Hardware, ver: RomVersion, reg: RomRegion) => {
    if (!timer0Auto) return;
    const defaults = lookupDefaultRanges(hw, ver, reg);
    if (defaults) {
      setRanges(defaults);
    } else {
      setTimer0Auto(false);
      toast.warning(
        t`No default Timer0/VCount data for this combination. Switched to manual mode.`
      );
    }
  };

  const handleVersionChange = (version: RomVersion) => {
    setConfig({ version });
    applyAutoRanges(config.hardware, version, config.region);
  };

  const handleRegionChange = (region: RomRegion) => {
    setConfig({ region });
    applyAutoRanges(config.hardware, config.version, region);
  };

  const handleHardwareChange = (hardware: Hardware) => {
    setConfig({ hardware });
    applyAutoRanges(hardware, config.version, config.region);
  };

  return (
    <div className="space-y-4">
      {/* Version */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Version</Trans>
        </Label>
        <Select value={config.version} onValueChange={handleVersionChange}>
          <SelectTrigger aria-label={t`Version`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERSION_ORDER.map((v) => (
              <SelectItem key={v} value={v}>
                {getVersionName(v, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Region</Trans>
        </Label>
        <Select value={config.region} onValueChange={handleRegionChange}>
          <SelectTrigger aria-label={t`Region`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGION_ORDER.map((r) => (
              <SelectItem key={r} value={r}>
                {getRegionName(r, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hardware */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Hardware</Trans>
        </Label>
        <Select value={config.hardware} onValueChange={handleHardwareChange}>
          <SelectTrigger aria-label={t`Hardware`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HARDWARE_ORDER.map((h) => (
              <SelectItem key={h} value={h}>
                {getHardwareName(h, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MAC Address */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>MAC address</Trans>
        </Label>
        <MacAddressInput value={config.mac} onChange={(mac) => setConfig({ mac })} />
      </div>

      {/* Timer0/VCount Section */}
      <Timer0VCountSection />
    </div>
  );
}

export { DsConfigForm };
