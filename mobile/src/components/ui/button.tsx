import * as React from 'react';
import { TouchableOpacity, Text, type TouchableOpacityProps, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl transition-all active:opacity-80 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 shadow-md shadow-blue-500/20',
        destructive: 'bg-red-600 shadow-md shadow-red-500/20',
        outline: 'border border-slate-200 dark:border-slate-800 bg-transparent',
        secondary: 'bg-slate-100 dark:bg-slate-800',
        ghost: 'bg-transparent',
        link: 'bg-transparent underline',
        success: 'bg-emerald-600 shadow-md shadow-emerald-500/20',
      },
      size: {
        default: 'h-12 px-5 py-3',
        sm: 'h-9 px-3.5 py-1.5 rounded-lg',
        lg: 'h-14 px-8 py-4 rounded-2xl',
        icon: 'h-11 w-11 p-0 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-bold text-center', {
  variants: {
    variant: {
      default: 'text-white',
      destructive: 'text-white',
      outline: 'text-slate-900 dark:text-slate-100',
      secondary: 'text-slate-900 dark:text-slate-100',
      ghost: 'text-slate-900 dark:text-slate-100',
      link: 'text-blue-600 dark:text-blue-400 underline',
      success: 'text-white',
    },
    size: {
      default: 'text-sm',
      sm: 'text-xs',
      lg: 'text-base',
      icon: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  label?: string;
  textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ className, textClassName, variant, size, children, label, ...props }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        activeOpacity={0.8}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {label ? (
          <Text className={cn(buttonTextVariants({ variant, size, className: textClassName }))}>
            {label}
          </Text>
        ) : typeof children === 'string' ? (
          <Text className={cn(buttonTextVariants({ variant, size, className: textClassName }))}>
            {children}
          </Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
