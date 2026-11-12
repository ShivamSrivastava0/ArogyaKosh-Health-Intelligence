import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-2 active:bg-black',
  accent: 'bg-lime text-ink hover:brightness-95 active:brightness-90',
  secondary: 'bg-surface text-ink border border-line hover:border-ink-4 hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-ink/5 hover:text-ink',
  danger: 'bg-bad text-white hover:brightness-95',
  'danger-ghost': 'text-bad hover:bg-bad-soft',
};
const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-full',
  md: 'h-11 px-5 text-[14px] gap-2 rounded-full',
  lg: 'h-12 px-7 text-[15px] gap-2 rounded-full',
  icon: 'h-9 w-9 rounded-full justify-center',
  'icon-sm': 'h-8 w-8 rounded-full justify-center',
};

export const Spinner = ({ className }) => (
  <svg className={clsx('animate-spin', className || 'h-4 w-4')} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, iconRight: IconRight, to, href, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = clsx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background,color,border,filter,transform] active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant], SIZES[size], className,
  );
  const iconSize = size === 'xs' || size === 'icon-sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const content = (
    <>
      {loading ? <Spinner className={iconSize} /> : Icon && <Icon className={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className={iconSize} aria-hidden />}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  return <button ref={ref} type={type} className={cls} disabled={disabled || loading} {...rest}>{content}</button>;
});

export default Button;
