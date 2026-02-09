import { Trans, useLingui } from '@lingui/react/macro';
import { useDsConfigStore } from '@/stores/settings/ds-config';
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
import { toast } from '@/components/ui/toast-state';
import { Timer0VCountSection } from './timer0-vcount-section';
import type { Hardware, RomVersion, RomRegion } from '@/wasm/wasm_pkg';

function DsConfigForm() {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  // 個別スライス購読 — config 全体ではなくフィールド単位
  const version = useDsConfigStore((s) => s.config.version);
  const region = useDsConfigStore((s) => s.config.region);
  const hardware = useDsConfigStore((s) => s.config.hardware);
  const mac = useDsConfigStore((s) => s.config.mac);
  const setConfig = useDsConfigStore((s) => s.setConfig);

  const notifyFallback = (result: 'auto-fallback' | undefined) => {
    if (result === 'auto-fallback') {
      toast.warning(
        t`No default Timer0/VCount data for this combination. Switched to manual mode.`
      );
    }
  };

  const handleVersionChange = (v: RomVersion) => {
    notifyFallback(setConfig({ version: v }));
  };

  const handleRegionChange = (r: RomRegion) => {
    notifyFallback(setConfig({ region: r }));
  };

  const handleHardwareChange = (h: Hardware) => {
    notifyFallback(setConfig({ hardware: h }));
  };

  return (
    <div className="space-y-4">
      {/* Version */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          <Trans>Version</Trans>
        </Label>
        <Select value={version} onValueChange={handleVersionChange}>
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
        <Select value={region} onValueChange={handleRegionChange}>
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
        <Select value={hardware} onValueChange={handleHardwareChange}>
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
        <MacAddressInput value={mac} onChange={(m) => setConfig({ mac: m })} />
      </div>

      {/* Timer0/VCount Section */}
      <Timer0VCountSection />
    </div>
  );
}

export { DsConfigForm };
