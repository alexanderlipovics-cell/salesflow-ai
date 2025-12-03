import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-sf-primary text-white hover:bg-sf-primary/80',
    secondary: 'border-transparent bg-sf-surface text-sf-text hover:bg-sf-surface/80',
    destructive: 'border-transparent bg-sf-error text-white hover:bg-sf-error/80',
    outline: 'text-sf-text border-sf-border',
    success: 'border-transparent bg-sf-success text-white hover:bg-sf-success/80',
    warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
