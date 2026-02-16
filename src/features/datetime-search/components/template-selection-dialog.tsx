/**
 * テンプレート選択ダイアログ
 *
 * 定義済み MT Seed テンプレートを一覧表示し、
 * ユーザーが選択したテンプレートの Seed を統合して返す。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SEED_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  toTemplateVersion,
  type TemplateCategoryFilter,
} from '@/data/seed-templates';
import { useUiSettings } from '@/hooks/use-ui-settings';
import type { MtSeed, RomVersion } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateSelectionDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** テンプレート適用コールバック (統合済み Seed 配列) */
  onApply: (seeds: MtSeed[]) => void;
  /** 現在の ROM バージョン (フィルタ用) */
  currentVersion: RomVersion;
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const CATEGORY_FILTER_OPTIONS: TemplateCategoryFilter[] = ['all', 'stationary', 'roamer'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TemplateSelectionDialog({
  open,
  onOpenChange,
  onApply,
  currentVersion,
}: TemplateSelectionDialogProps): ReactElement {
  const { language } = useUiSettings();

  // ダイアログ内一時状態
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategoryFilter>('all');

  // バージョンフィルタ + カテゴリフィルタ
  const filteredTemplates = useMemo(() => {
    const tv = toTemplateVersion(currentVersion);
    return SEED_TEMPLATES.filter((tpl) => {
      if (tpl.version !== tv) return false;
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      return true;
    });
  }, [currentVersion, categoryFilter]);

  // 選択中の Seed 総数 (重複排除)
  const selectedSeedCount = useMemo(() => {
    const merged = new Set<number>();
    for (const tpl of SEED_TEMPLATES) {
      if (selectedIds.has(tpl.id)) {
        for (const seed of tpl.seeds) merged.add(seed);
      }
    }
    return merged.size;
  }, [selectedIds]);

  // Checkbox トグル
  const handleToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // 適用
  const handleApply = useCallback(() => {
    const merged = new Set<number>();
    for (const tpl of SEED_TEMPLATES) {
      if (selectedIds.has(tpl.id)) {
        for (const seed of tpl.seeds) merged.add(seed);
      }
    }
    onApply([...merged]);
    onOpenChange(false);
  }, [selectedIds, onApply, onOpenChange]);

  // ダイアログ開閉時にリセット
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedIds(new Set());
        setCategoryFilter('all');
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Trans>Seed template selection</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Select seed templates to apply to Target Seeds.</Trans>
          </DialogDescription>
        </DialogHeader>

        {/* カテゴリフィルタ */}
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-xs">
            <Trans>Category</Trans>
          </Label>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as TemplateCategoryFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {TEMPLATE_CATEGORY_LABELS[opt][language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* テンプレート一覧 */}
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              <Trans>No templates match the current filter.</Trans>
            </p>
          ) : (
            filteredTemplates.map((tpl) => (
              <label
                key={tpl.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-sm border border-border p-2 transition-colors hover:bg-accent/50',
                  selectedIds.has(tpl.id) && 'border-primary/50 bg-accent/30'
                )}
              >
                <Checkbox
                  checked={selectedIds.has(tpl.id)}
                  onCheckedChange={(checked) => handleToggle(tpl.id, checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{tpl.name[language]}</span>
                    <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                      {tpl.seeds.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tpl.description[language]}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button size="sm" onClick={handleApply} disabled={selectedSeedCount === 0}>
            <Trans>Apply ({selectedSeedCount})</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { TemplateSelectionDialog };
export type { TemplateSelectionDialogProps };
