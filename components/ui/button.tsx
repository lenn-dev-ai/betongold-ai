import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-mono text-[11px] tracking-[.12em] uppercase transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed rounded-none',
  {
    variants: {
      variant: {
        default: 'ia-btn-gold',
        outline: 'ia-btn-outline',
        ghost: 'bg-transparent border-none text-muted2 hover:text-text px-4 py-2',
      },
      size: {
        default: 'py-3 px-6',
        sm: 'py-1.5 px-3 text-[10px]',
        lg: 'py-4 px-8 text-[12px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
