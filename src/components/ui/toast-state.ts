// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Toast Store (module-scope state + useSyncExternalStore)
// ---------------------------------------------------------------------------

type ToastListener = () => void;

let currentToast: ToastData | undefined;
let listeners: ToastListener[] = [];

const DEFAULT_DURATION_MS = 3000;
/** Max safe value for setTimeout (2^31 - 1). Used for error toasts that require manual dismissal. */
const MANUAL_DISMISS_DURATION_MS = 2_147_483_647;

function subscribe(listener: ToastListener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): ToastData | undefined {
  return currentToast;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function resolveDuration(variant: ToastVariant, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  return variant === 'error' ? MANUAL_DISMISS_DURATION_MS : DEFAULT_DURATION_MS;
}

// ---------------------------------------------------------------------------
// toast() function (imperative API)
// ---------------------------------------------------------------------------

function toast(options: ToastOptions): void {
  const variant = options.variant ?? 'info';
  currentToast = {
    id: crypto.randomUUID(),
    title: options.title,
    description: options.description,
    variant,
    duration: resolveDuration(variant, options.duration),
  };
  emitChange();
}

toast.success = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'success' });

toast.error = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'error' });

toast.warning = (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
  toast({ ...options, title, variant: 'warning' });

function dismissToast(): void {
  currentToast = undefined;
  emitChange();
}

export { toast, dismissToast, subscribe, getSnapshot, DEFAULT_DURATION_MS };
export type { ToastData, ToastOptions, ToastVariant };
