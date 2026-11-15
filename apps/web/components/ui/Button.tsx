import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'orange' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  glow?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  glow = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3 rounded-2xl',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 border border-indigo-400/30',
    secondary: 'bg-surface-elevated text-slate-200 hover:bg-surface-card border border-slate-700/60 hover:border-slate-500',
    accent: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 border border-cyan-400/30',
    orange: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 border border-orange-400/40',
    danger: 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-500 hover:to-rose-600 border border-red-500/30',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-surface-elevated',
  };

  const glowStyles = glow ? {
    primary: 'shadow-glow-primary',
    secondary: 'shadow-lg shadow-black/40',
    accent: 'shadow-glow-cyan',
    orange: 'shadow-glow-orange',
    danger: 'shadow-lg shadow-red-500/30',
    ghost: '',
  }[variant] : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${glowStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
