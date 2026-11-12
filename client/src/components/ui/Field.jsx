import { forwardRef, useId, useState } from 'react';
import clsx from 'clsx';
import { LuX, LuChevronDown } from 'react-icons/lu';

export function Field({ label, hint, error, children, className, optional, htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {optional && <span className="ml-1 font-normal text-ink-4">optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-bad">{error}</p> : hint ? <p className="mt-1.5 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, optional, className, inputClassName, prefix, suffix, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={props.id || id}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{prefix}</span>}
        <input
          ref={ref}
          id={props.id || id}
          className={clsx('input', error && 'input-error', prefix && 'pl-8', suffix && 'pr-14', inputClassName)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-3">{suffix}</span>}
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, optional, className, rows = 3, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={id}>
      <textarea ref={ref} id={id} rows={rows} className={clsx('input h-auto py-2.5 leading-relaxed', error && 'input-error')} {...props} />
    </Field>
  );
});

/** options: object map {value: label} or array of [value, label] or array of strings */
export const toOptions = (options) => {
  if (Array.isArray(options)) return options.map((o) => (Array.isArray(o) ? o : [o, o]));
  return Object.entries(options);
};

export const Select = forwardRef(function Select({ label, hint, error, optional, className, options, placeholder, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} htmlFor={id}>
      <div className="relative">
        <select ref={ref} id={id} className={clsx('input appearance-none pr-9', error && 'input-error', !props.value && 'text-ink-3')} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {toOptions(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    </Field>
  );
});

export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className={clsx('flex cursor-pointer items-start justify-between gap-4', disabled && 'opacity-50')}>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-3">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-ink' : 'bg-line')}
      >
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')}>
          {checked && <span className="absolute inset-1.5 rounded-full bg-lime" />}
        </span>
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className }) {
  return (
    <label className={clsx('inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-2', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line accent-ink" />
      {label}
    </label>
  );
}

/** Pill-style single choice. options as in toOptions. */
export function Segmented({ value, onChange, options, size = 'md', className }) {
  return (
    <div className={clsx('inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1', className)} role="radiogroup">
      {toOptions(options).map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={clsx(
            'rounded-full font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
            value === v ? 'bg-ink text-white' : 'text-ink-3 hover:bg-paper hover:text-ink',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Choose-many chips (e.g. weekdays). */
export function ChipToggle({ values = [], onChange, options }) {
  const toggle = (v) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {toOptions(options).map(([v, l]) => (
        <button key={v} type="button" onClick={() => toggle(v)}
          className={clsx('h-8 rounded-full border px-3 text-xs font-medium transition-colors',
            values.includes(v) ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-4')}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Type-and-enter list of strings. */
export function TagInput({ label, value = [], onChange, placeholder, hint }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 focus-within:border-ink focus-within:ring-4 focus-within:ring-lime/50">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><LuX className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-ink-4"
        />
      </div>
    </Field>
  );
}
