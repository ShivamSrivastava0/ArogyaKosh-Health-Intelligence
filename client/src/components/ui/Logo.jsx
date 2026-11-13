import clsx from 'clsx';

export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#0B2239" />
      <path d="M17 34h8l5-11 7 20 5-9h8" fill="none" stroke="#2DD4BF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ className, mark = true, size = 'md' }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      {mark && <LogoMark className={size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} />}
      <span className={clsx('font-display font-bold tracking-tight', size === 'sm' ? 'text-lg' : 'text-xl')}>
        arogya<span className="rounded-md bg-lime px-1">kosh</span>
      </span>
    </span>
  );
}
