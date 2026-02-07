import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseHexByte, toHexString, parseMacAddress } from '@/lib/hex';
import { handleFocusSelectAll } from '@/components/forms/input-helpers';

type MacAddress = [number, number, number, number, number, number];

interface MacAddressInputProps {
  /** 現在の MAC アドレス (6 バイト配列) */
  value: MacAddress;
  /** 値変更コールバック */
  onChange: (value: MacAddress) => void;
  /** 無効化 */
  disabled?: boolean;
}

function MacAddressInput({ value, onChange, disabled }: MacAddressInputProps) {
  const [locals, setLocals] = React.useState<string[]>(() => value.map(toHexString));
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  // ref で最新の locals を保持。auto-tab による blur が setState 反映前に
  // 発火する問題を回避するため、handleChange で即座に更新する。
  const localsRef = React.useRef<string[]>(locals);

  React.useEffect(() => {
    const next = value.map(toHexString);
    setLocals(next);
    localsRef.current = next;
  }, [value]);

  const handleChange = (index: number, raw: string) => {
    // 16 進数文字のみ許容
    const filtered = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 2);
    const next = [...localsRef.current];
    next[index] = filtered;
    localsRef.current = next;
    setLocals(next);

    // 2 文字入力で自動タブ移動
    if (filtered.length === 2 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBlur = (index: number) => {
    const parsed = parseHexByte(localsRef.current[index], value[index]);
    const nextLocals = [...localsRef.current];
    nextLocals[index] = toHexString(parsed);
    localsRef.current = nextLocals;
    setLocals(nextLocals);

    const nextValue = [...value] as MacAddress;
    nextValue[index] = parsed;
    onChange(nextValue);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = e.clipboardData.getData('text');
    const mac = parseMacAddress(pasted);
    if (mac) {
      e.preventDefault();
      const nextLocals = mac.map(toHexString);
      localsRef.current = nextLocals;
      setLocals(nextLocals);
      onChange(mac);
      // 最後のフィールドにフォーカス
      inputRefs.current[5]?.focus();
      return;
    }
    // 単一バイトのペーストはデフォルト動作に委ねる (handleChange でフィルタされる)
    // ただし index に対して 2 文字分だけ処理
    const cleaned = pasted.replace(/[^0-9a-fA-F]/g, '').slice(0, 2);
    if (cleaned.length > 0) {
      e.preventDefault();
      handleChange(index, cleaned);
    }
  };

  return (
    <div className={cn('flex items-center gap-1')}>
      {value.map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-sm text-muted-foreground">-</span>}
          <Input
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            className="w-10 px-1 text-center font-mono tabular-nums uppercase"
            value={locals[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onFocus={handleFocusSelectAll}
            onBlur={() => handleBlur(i)}
            onPaste={(e) => handlePaste(e, i)}
            maxLength={2}
            disabled={disabled}
            aria-label={`MAC byte ${i + 1}`}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export type { MacAddressInputProps };
export { MacAddressInput };
