import { IvRangeInput } from './iv-range-input';
import { HiddenPowerSelect } from './hidden-power-select';
import type { IvFilterInput } from '@/lib/search-filter-context';

export function IvFilterFields({
  value,
  onChange,
  disabled,
}: {
  value: IvFilterInput;
  onChange: (value: IvFilterInput) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <IvRangeInput value={value} onChange={onChange} disabled={disabled} />
      <HiddenPowerSelect
        value={value.hidden_power_types ?? []}
        onChange={(types) =>
          onChange({ ...value, hidden_power_types: types.length > 0 ? types : undefined })
        }
        minPower={value.hidden_power_min_power}
        onMinPowerChange={(hidden_power_min_power) =>
          onChange({ ...value, hidden_power_min_power })
        }
        powerEnabled={value.powerEnabled ?? value.hidden_power_min_power !== undefined}
        onPowerEnabledChange={(powerEnabled) =>
          onChange({
            ...value,
            powerEnabled,
            hidden_power_min_power: value.hidden_power_min_power ?? 30,
          })
        }
        disabled={disabled}
      />
    </>
  );
}
