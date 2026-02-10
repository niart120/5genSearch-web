import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
      ref={ref}
    />
  );
}

const sheetVariants = cva(
  'fixed z-50 bg-background shadow-lg transition-transform duration-300 ease-in-out data-[state=closed]:duration-200',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top-2 data-[state=closed]:-translate-y-full',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:translate-y-full',
        left: 'inset-y-0 left-0 h-full border-r data-[state=open]:slide-in-from-left-2 data-[state=closed]:-translate-x-full',
        right:
          'inset-y-0 right-0 h-full border-l data-[state=open]:slide-in-from-right-2 data-[state=closed]:translate-x-full',
      },
    },
    defaultVariants: {
      side: 'left',
    },
  }
);

interface SheetContentProps
  extends
    React.ComponentPropsWithRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

function SheetContent({ side = 'left', className, children, ref, ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-4 text-left', className)} {...props} />;
}

function SheetTitle({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
export type { SheetContentProps };
