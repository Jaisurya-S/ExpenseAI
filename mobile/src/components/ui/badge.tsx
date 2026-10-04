import * as React from 'react';
import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'flex-row items-center self-start rounded-full px-2.5 py-0.5 border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600',
        secondary: 'border-transparent bg-slate-100 dark:bg-slate-800',
        destructive: 'border-transparent bg-red-500',
        outline: 'border-slate-200 dark:border-slate-800 bg-transparent',
        success: 'border-transparent bg-emerald-500',
        subtle: 'border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-slate-900 dark:text-slate-100',
      destructive: 'text-white',
      outline: 'text-slate-950 dark:text-slate-50',
      success: 'text-white',
      subtle: 'text-blue-600 dark:text-blue-400',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  label?: string;
  textClassName?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant, textClassName, label, children, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {label ? (
        <Text className={cn(badgeTextVariants({ variant }), textClassName)}>{label}</Text>
      ) : typeof children === 'string' ? (
        <Text className={cn(badgeTextVariants({ variant }), textClassName)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export { Badge, badgeVariants, badgeTextVariants };
