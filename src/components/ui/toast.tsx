import { useSyncExternalStore } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  dismissToast,
  subscribe,
  getSnapshot,
  DEFAULT_DURATION_MS,
  type ToastData,
  type ToastVariant,
} from './toast-state';

// ---------------------------------------------------------------------------
// Variants (cva)
// ---------------------------------------------------------------------------

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-sm border p-3 shadow-md transition-all',
  {
    variants: {
      variant: {
        info: 'border-ring bg-background text-foreground',
        success: 'border-success bg-background text-foreground',
        warning: 'border-warning bg-background text-foreground',
        error: 'border-destructive bg-background text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

// ---------------------------------------------------------------------------
// Toaster component
// ---------------------------------------------------------------------------

const SERVER_SNAPSHOT = undefined;

function Toaster() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const data = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  return (
    <ToastPrimitive.Provider
      swipeDirection={isDesktop ? 'right' : 'down'}
      duration={data?.duration ?? DEFAULT_DURATION_MS}
    >
      {data && <ToastItem data={data} isDesktop={isDesktop} />}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed z-50 flex max-w-sm flex-col',
          isDesktop ? 'bottom-4 right-4' : 'bottom-4 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2'
        )}
      />
    </ToastPrimitive.Provider>
  );
}

function ToastItem({ data, isDesktop }: { data: ToastData; isDesktop: boolean }) {
  const Icon = VARIANT_ICONS[data.variant];

  return (
    <ToastPrimitive.Root
      key={data.id}
      className={cn(
        toastVariants({ variant: data.variant }),
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fade-in-0',
        isDesktop
          ? 'data-[state=closed]:slide-out-to-right-2 data-[state=closed]:fade-out-0'
          : 'data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:fade-out-0',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
        'data-[swipe=end]:animate-out'
      )}
      onOpenChange={(open) => {
        if (!open) dismissToast();
      }}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-1">
        <ToastPrimitive.Title className="text-sm font-medium">{data.title}</ToastPrimitive.Title>
        {data.description && (
          <ToastPrimitive.Description className="text-xs text-muted-foreground">
            {data.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
        aria-label="Close"
      >
        <X className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export { Toaster };
