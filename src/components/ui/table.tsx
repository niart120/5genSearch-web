import { type ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

function Table({ className, ref, ...props }: ComponentPropsWithRef<'table'>) {
  return (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ref, ...props }: ComponentPropsWithRef<'thead'>) {
  return (
    <thead
      ref={ref}
      className={cn('sticky top-0 bg-muted text-xs [&_tr]:border-b', className)}
      {...props}
    />
  );
}

function TableBody({ className, ref, ...props }: ComponentPropsWithRef<'tbody'>) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableRow({ className, ref, ...props }: ComponentPropsWithRef<'tr'>) {
  return (
    <tr
      ref={ref}
      className={cn(
        'border-b border-border transition-colors hover:bg-accent/10 odd:bg-background even:bg-muted/30',
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ref, ...props }: ComponentPropsWithRef<'th'>) {
  return (
    <th
      ref={ref}
      className={cn(
        'px-2 py-1 text-left align-middle font-medium text-muted-foreground select-none',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ref, ...props }: ComponentPropsWithRef<'td'>) {
  return <td ref={ref} className={cn('px-2 py-1 align-middle', className)} {...props} />;
}

function TableCaption({ className, ref, ...props }: ComponentPropsWithRef<'caption'>) {
  return (
    <caption ref={ref} className={cn('mt-2 text-sm text-muted-foreground', className)} {...props} />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
