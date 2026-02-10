import * as React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.ComponentPropsWithRef<'input'>;

function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-8 w-full rounded-sm border border-input bg-background px-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

export type { InputProps };
export { Input };
