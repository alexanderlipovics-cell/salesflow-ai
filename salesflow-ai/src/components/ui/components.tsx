// ============================================
// 🎨 SALESFLOW AI - REUSABLE UI COMPONENTS
// ============================================

import React, { forwardRef, memo, useState, useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ==================== BUTTON ====================

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        outline: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/25',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg shadow-green-500/25',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" className="text-current" />
      ) : leftIcon ? (
        leftIcon
      ) : null}
      {children}
      {rightIcon && !isLoading && rightIcon}
    </button>
  )
));
Button.displayName = 'Button';

// ==================== CARD ====================

const cardVariants = cva(
  'rounded-2xl transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800',
        elevated: 'bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50',
        gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-100 dark:border-gray-800',
        glass: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false,
    },
  }
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = memo(forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding, interactive }), className)} {...props} />
  )
));
Card.displayName = 'Card';

export const CardHeader = memo(({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between mb-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = memo(({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = memo(({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// ==================== BADGE ====================

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-full transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        hot: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
        warm: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
        cold: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge = memo(({ className, variant, size, dot, children, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
    {children}
  </span>
));
Badge.displayName = 'Badge';

// ==================== AVATAR ====================

const avatarVariants = cva(
  'relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden',
  {
    variants: {
      size: {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-20 h-20 text-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export const Avatar = memo(({ className, size, src, alt, fallback, status, ...props }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const initials = fallback || alt?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className={cn(avatarVariants({ size }), 'flex-shrink-0', className)} {...props}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">{initials}</span>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
            {
              'bg-green-500': status === 'online',
              'bg-gray-400': status === 'offline',
              'bg-amber-500': status === 'away',
              'bg-red-500': status === 'busy',
            }
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';

// ==================== INPUT ====================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 dark:border-gray-700',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {(error || hint) && (
        <p className={cn('mt-1.5 text-sm', error ? 'text-red-500' : 'text-gray-500')}>
          {error || hint}
        </p>
      )}
    </div>
  )
));
Input.displayName = 'Input';

// ==================== TEXTAREA ====================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full min-h-[100px] px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-200 resize-none',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 dark:border-gray-700',
          className
        )}
        {...props}
      />
      {(error || hint) && (
        <p className={cn('mt-1.5 text-sm', error ? 'text-red-500' : 'text-gray-500')}>
          {error || hint}
        </p>
      )}
    </div>
  )
));
Textarea.displayName = 'Textarea';

// ==================== SPINNER ====================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner = memo(({ size = 'md', className }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
});
Spinner.displayName = 'Spinner';

// ==================== SKELETON ====================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = memo(({ className, variant = 'text', width, height }: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height: height || (variant === 'text' ? '1em' : undefined) }}
    />
  );
});
Skeleton.displayName = 'Skeleton';

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = memo(({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
    {icon && <div className="mb-4 text-gray-300 dark:text-gray-600">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
    {description && <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
));
EmptyState.displayName = 'EmptyState';

// ==================== PULL TO REFRESH ====================

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing || containerRef.current?.scrollTop !== 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{ height: pullDistance, minHeight: isRefreshing ? threshold : 0 }}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <Spinner size="sm" className={cn(pullDistance >= threshold || isRefreshing ? 'text-blue-500' : 'text-gray-400')} />
        )}
      </div>
      {children}
    </div>
  );
};

// ==================== SWIPEABLE ====================

interface SwipeableProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Swipeable = ({ onSwipeLeft, onSwipeRight, leftAction, rightAction, children, className }: SwipeableProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    const maxOffset = 120;

    if ((diff > 0 && rightAction) || (diff < 0 && leftAction)) {
      setOffsetX(Math.max(-maxOffset, Math.min(maxOffset, diff)));
    }
  };

  const handleTouchEnd = () => {
    if (offsetX >= threshold && onSwipeRight) {
      onSwipeRight();
    } else if (offsetX <= -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffsetX(0);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left Action (shown when swiping right) */}
      {rightAction && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center justify-start px-4 bg-green-500 text-white">
          {rightAction}
        </div>
      )}

      {/* Right Action (shown when swiping left) */}
      {leftAction && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end px-4 bg-red-500 text-white">
          {leftAction}
        </div>
      )}

      {/* Content */}
      <div
        className="relative bg-white dark:bg-gray-900 transition-transform duration-200"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// ==================== BOTTOM SHEET ====================

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'auto' | 'half' | 'full';
}

export const BottomSheet = ({ isOpen, onClose, title, children, height = 'auto' }: BottomSheetProps) => {
  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[95vh]',
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50',
          'animate-in slide-in-from-bottom duration-300',
          heightClasses[height]
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="overflow-auto p-4" style={{ maxHeight: 'calc(100% - 60px)' }}>
          {children}
        </div>
      </div>
    </>
  );
};

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gradient';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar = memo(({ value, max = 100, size = 'md', color = 'blue', showLabel, className }: ProgressBarProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gradient: 'bg-gradient-to-r from-blue-500 to-indigo-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</p>
      )}
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// ==================== STAT CARD ====================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const StatCard = memo(({ label, value, change, icon, trend, className }: StatCardProps) => (
  <Card className={cn('relative overflow-hidden', className)} padding="md">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 mt-1 text-sm font-medium', {
            'text-green-600': trend === 'up',
            'text-red-600': trend === 'down',
            'text-gray-500': trend === 'neutral',
          })}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
      {icon && (
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
      )}
    </div>
  </Card>
));
StatCard.displayName = 'StatCard';

// ==================== TABS ====================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs = memo(({ tabs, activeTab, onChange, variant = 'default', className }: TabsProps) => {
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-xl',
    pills: 'gap-2',
    underline: 'border-b border-gray-200 dark:border-gray-700',
  };

  const tabClasses = {
    default: (active: boolean) => cn(
      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
      active
        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    ),
    pills: (active: boolean) => cn(
      'px-4 py-2 rounded-full text-sm font-medium transition-all',
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
    ),
    underline: (active: boolean) => cn(
      'px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    ),
  };

  return (
    <div className={cn('flex', variantClasses[variant], className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn('flex items-center gap-2', tabClasses[variant](activeTab === tab.id))}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});
Tabs.displayName = 'Tabs';
