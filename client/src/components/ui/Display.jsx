import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { LuTrendingUp, LuTrendingDown, LuMinus } from 'react-icons/lu';
import { initials } from '../../lib/format';
import { STATUS_LABEL, STATUS_TONE } from '../../lib/constants';

export function Card({ className, children, as: As = 'div', ...rest }) {
  return <As className={clsx('card', className)} {...rest}>{children}</As>;
}

export function CardHeader({ title, subtitle, action, className, icon: Icon }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex items-center gap-2.5">
        {Icon && <span className="grid h-8 w-8 place-items-center rounded-full bg-paper"><Icon className="h-4 w-4" /></span>}
        <div>
          <h3 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES = {
  neutral: 'bg-paper text-ink-2 border-line',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  bad: 'bg-bad-soft text-bad border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  lime: 'bg-lime-soft text-lime-deep border-transparent',
  ink: 'bg-ink text-white border-transparent',
};

export function Badge({ tone = 'neutral', children, className, dot }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-semibold', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'neutral'} dot>{STATUS_LABEL[status] || status}</Badge>;

export const TrendIcon = ({ trend, className = 'h-3.5 w-3.5' }) => {
  if (trend === 'UP') return <LuTrendingUp className={className} aria-label="Rising" />;
  if (trend === 'DOWN') return <LuTrendingDown className={className} aria-label="Falling" />;
  if (trend === 'FLAT') return <LuMinus className={className} aria-label="Stable" />;
  return null;
};

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
const COLORS = {
  lime: 'bg-tint-lime', sky: 'bg-tint-sky', peach: 'bg-tint-peach', lilac: 'bg-tint-lilac',
  mint: 'bg-tint-mint', sun: 'bg-tint-sun', rose: 'bg-tint-rose', sand: 'bg-tint-sand',
};

export function Avatar({ name, color = 'lime', size = 'md', className, ring }) {
  return (
    <span className={clsx('inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-ink', SIZES[size], COLORS[color] || COLORS.lime, ring && 'ring-2 ring-surface', className)} title={name}>
      {initials(name)}
    </span>
  );
}

export function MemberChip({ member, className }) {
  if (!member) return <span className="text-xs text-ink-3">Household</span>;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-[13px] text-ink-2', className)}>
      <Avatar name={member.name} color={member.color} size="xs" />
      <span className="truncate">{member.name?.split(' ')[0]}</span>
    </span>
  );
}

export function Empty({ icon: Icon, title, body, action, className, compact }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-paper">
          <Icon className="h-5 w-5 text-ink-2" />
        </span>
      )}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }) => <div className={clsx('animate-pulse rounded-xl bg-line-soft', className)} />;

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function ErrorNote({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">
      <span>{message}</span>
      {onRetry && <button type="button" className="font-semibold underline underline-offset-4" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink">← {back.label}</Link>}
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone, className, children }) {
  return (
    <div className={clsx('card p-5', className)}>
      <p className="text-[13px] font-medium text-ink-3">{label}</p>
      <p className={clsx('tnum mt-2 font-display text-[28px] font-semibold leading-none', tone === 'bad' && 'text-bad', tone === 'warn' && 'text-warn', tone === 'ok' && 'text-ok')}>{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
      {children}
    </div>
  );
}

/** Circular progress for scores. */
export function ScoreRing({ value, size = 88, stroke = 8, label, className, tone }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  const color = tone || (value === null || value === undefined ? '#E7E5DE' : v >= 80 ? '#1E8E4E' : v >= 60 ? '#B86E00' : '#D0372A');
  return (
    <div className={clsx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F0EEE8" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tnum font-display font-semibold leading-none" style={{ fontSize: size * 0.3 }}>{value ?? '—'}</div>
          {label && <div className="mt-0.5 text-[10px] font-medium text-ink-3">{label}</div>}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, className, tone = 'ink' }) {
  const colors = { ink: 'bg-ink', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', lime: 'bg-lime' };
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-line-soft', className)}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500', colors[tone])} style={{ width: `${Math.min(Math.max(value || 0, 0), 100)}%` }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx('scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={clsx('relative -mb-px flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition-colors',
            value === t.value ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
          {t.label}
          {t.count !== undefined && t.count !== null && <span className={clsx('rounded-full px-1.5 text-2xs', value === t.value ? 'bg-ink text-white' : 'bg-line-soft text-ink-3')}>{t.count}</span>}
          {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ label, children, className }) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-4 py-2.5', className)}>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{children || <span className="font-normal text-ink-4">—</span>}</dd>
    </div>
  );
}
