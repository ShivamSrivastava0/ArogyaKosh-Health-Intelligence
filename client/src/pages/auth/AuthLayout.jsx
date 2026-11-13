import { Link } from 'react-router-dom';
import { LuBrainCircuit, LuQrCode, LuShare2 } from 'react-icons/lu';
import { FamilyArt } from '../../components/illustrations';
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
        <p className="eyebrow relative text-lime">Predictive health for the whole family</p>
        <div className="relative space-y-4">
          <FamilyArt className="mx-auto w-full max-w-sm" />
          <div className="rounded-3xl bg-white p-5 text-ink shadow-pop">
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-brand"><LuBrainCircuit className="h-3.5 w-3.5" />ArogyaPredict · example</p>
            <p className="mt-2 text-sm font-semibold">Papa’s BP is improving — down 4 mmHg/month</p>
            <p className="mt-1 text-sm font-semibold">Your fasting sugar may reach prediabetes by March</p>
            <p className="mt-1 text-xs text-ink-3">Heart age, forecasts and missed-dose alerts for everyone at home.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-3xl bg-white/5 p-4"><LuQrCode className="h-5 w-5 text-lime" /><p className="mt-3 text-sm font-semibold">Emergency QR</p><p className="text-xs text-white/60">Blood group & allergies in one scan</p></div>
            <div className="flex-1 rounded-3xl bg-white/5 p-4"><LuShare2 className="h-5 w-5 text-lime" /><p className="mt-3 text-sm font-semibold">Doctor brief</p><p className="text-xs text-white/60">Expiring link, zero paperwork</p></div>
          </div>
        </div>
        <p className="relative max-w-sm font-display text-2xl font-medium leading-snug">Know what’s coming — and act months earlier.</p>
      </aside>
    </div>
  );
}
