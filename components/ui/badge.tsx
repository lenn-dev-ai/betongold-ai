import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border font-mono text-[9px] tracking-[.1em] uppercase px-3 py-1.5 rounded-none',
  {
    variants: {
      variant: {
        default: 'border-border2 bg-s2 text-muted2',
        success: 'border-success/30 bg-success/5 text-success',
        warning: 'border-warning/30 bg-warning/5 text-warning',
        danger: 'border-danger/30 bg-danger/5 text-danger',
        gold: 'border-gold/30 bg-gold/5 text-gold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
