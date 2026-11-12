import { Link } from 'react-router-dom';
import { LuCheck, LuPill, LuQrCode, LuShare2 } from 'react-icons/lu';
import Logo from '../../components/ui/Logo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="w-fit"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-3">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-ink-3">{footer}</div>}
        </div>
        <p className="text-xs text-ink-4">Your data is private to your account. Not a substitute for medical advice.</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime/20 blur-3xl" />
        <p className="eyebrow relative text-lime">For the person who keeps the family's health together</p>
        <div className="relative space-y-4">
          <div className="rounded-3xl bg-white p-5 text-ink shadow-pop">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-3">Morning · 3 of 5 done</p>
            {[['Glycomet 500 mg', 'Papa · 8:30 am', true], ['Thyronorm 50 mcg', 'Mummy · 6:30 am', true], ['Telma 40 mg', 'Papa · 8:30 am', false]].map(([n, s, d]) => (
              <div key={n} className="mt-3 flex items-center gap-3">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${d ? 'bg-lime' : 'border border-line'}`}>{d ? <LuCheck className="h-4 w-4" /> : <LuPill className="h-4 w-4 text-ink-3" />}</span>
                <div className="flex-1"><p className={`text-sm font-semibold ${d ? 'text-ink-3 line-through' : ''}`}>{n}</p><p className="text-xs text-ink-3">{s}</p></div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-3xl bg-white/5 p-4"><LuQrCode className="h-5 w-5 text-lime" /><p className="mt-3 text-sm font-semibold">Emergency QR</p><p className="text-xs text-white/60">Blood group & allergies in one scan</p></div>
            <div className="flex-1 rounded-3xl bg-white/5 p-4"><LuShare2 className="h-5 w-5 text-lime" /><p className="mt-3 text-sm font-semibold">Doctor brief</p><p className="text-xs text-white/60">Expiring link, zero paperwork</p></div>
          </div>
        </div>
        <p className="relative max-w-sm font-display text-2xl font-medium leading-snug">No more carrying a plastic bag of reports to every appointment.</p>
      </aside>
    </div>
  );
}
