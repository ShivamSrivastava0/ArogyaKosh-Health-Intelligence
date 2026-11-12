import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  LuArrowRight, LuArrowUpRight, LuCheck, LuPill, LuQrCode, LuShare2, LuFileText, LuActivity, LuSyringe, LuShieldAlert,
  LuWallet, LuLock, LuDownload, LuBan, LuUsers, LuBell, LuSparkles, LuPlus, LuTriangleAlert, LuCalendarDays, LuMenu, LuX,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';
import { Avatar } from '../components/ui/Display';

function useDemo() {
  const { demo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try { await demo(); navigate('/app'); } catch (e) { toast.error(errorMessage(e)); setBusy(false); }
  };
  return { start, busy };
}

function Nav() {
  const { isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [['#features', 'Features'], ['#how', 'How it works'], ['#privacy', 'Privacy'], ['#faq', 'FAQ']];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-2 md:flex">
          {links.map(([href, l]) => <a key={href} href={href} className="hover:text-ink">{l}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? <Button to="/app" size="sm" iconRight={LuArrowRight}>Open dashboard</Button> : (
            <><Button to="/login" variant="ghost" size="sm">Sign in</Button><Button to="/register" size="sm">Get started free</Button></>
          )}
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <LuX className="h-5 w-5" /> : <LuMenu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="border-t border-line bg-paper px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium">{links.map(([href, l]) => <a key={href} href={href} onClick={() => setOpen(false)}>{l}</a>)}</div>
          <div className="mt-4 flex gap-2">{isAuthed ? <Button to="/app" size="sm" className="flex-1">Open dashboard</Button> : <><Button to="/login" variant="secondary" size="sm" className="flex-1">Sign in</Button><Button to="/register" size="sm" className="flex-1">Get started</Button></>}</div>
        </div>
      )}
    </header>
  );
}

const Mark = ({ children }) => <span className="relative isolate whitespace-nowrap"><span className="absolute inset-x-[-4px] bottom-[0.08em] top-[0.28em] -z-10 -rotate-1 rounded-lg bg-lime" />{children}</span>;

function HeroVisual() {
  const doses = [
    ['Glycomet 500 mg', 'Papa', '8:30 am', true, 'sky'],
    ['Thyronorm 50 mcg', 'Mummy', '6:30 am', true, 'lilac'],
    ['Telma 40 mg', 'Papa', '8:30 am', false, 'sky'],
    ['Vitamin D3 60K', 'You', '9:00 am', false, 'lime'],
  ];
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-dots opacity-70" />
      <div className="card rounded-[28px] p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div><p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-3">Today · Morning</p><p className="mt-0.5 font-display text-xl font-semibold">2 of 4 doses done</p></div>
          <div className="flex -space-x-2">{[['Aarav', 'lime'], ['Meera', 'peach'], ['Rajesh', 'sky'], ['Sunita', 'lilac']].map(([n, c]) => <Avatar key={n} name={n} color={c} size="sm" ring />)}</div>
        </div>
        <div className="mt-4 h-1 rounded-full bg-line-soft"><div className="h-full w-1/2 rounded-full bg-lime" /></div>
        <ul className="mt-2 divide-y divide-line-soft">
          {doses.map(([n, who, t, done, c]) => (
            <li key={n} className="flex items-center gap-3 py-3">
              <Avatar name={who} color={c} size="sm" />
              <div className="flex-1"><p className={clsx('text-sm font-semibold', done && 'text-ink-3 line-through decoration-ink-4')}>{n}</p><p className="text-xs text-ink-3">{who} · {t}</p></div>
              {done ? <span className="flex h-8 items-center gap-1 rounded-full bg-lime px-3 text-xs font-semibold"><LuCheck className="h-3.5 w-3.5" />Done</span>
                : <span className="flex h-8 items-center gap-1 rounded-full border border-ink px-3 text-xs font-semibold"><LuCheck className="h-3.5 w-3.5" />Taken</span>}
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-xs text-ink-3">
          <span>Afternoon · Evening · Night</span><span className="font-medium text-ink-2">6 more today</span>
        </div>
        <div className="h-14 sm:h-16" />
      </div>
      <div className="card absolute -bottom-6 -left-4 hidden w-60 rotate-[-3deg] p-4 shadow-pop sm:block lg:-left-12">
        <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bad-soft text-bad"><LuTriangleAlert className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold">Refill Glycomet</p><p className="text-xs text-ink-3">9 left · runs out in ~4 days</p></div></div>
      </div>
      <div className="absolute -right-3 -top-8 hidden rotate-[4deg] rounded-3xl border-2 border-ink bg-surface p-3 shadow-pop sm:block lg:-right-10">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-1"><QRCode value="https://arogyakosh.app/e/demo" size={58} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-bad">Medical ID</p><p className="font-display text-base font-bold">Rajesh S.</p><p className="text-xs text-ink-3">Blood B+ · 66 yrs</p></div>
        </div>
      </div>
      <div className="card absolute -bottom-12 -right-3 hidden w-56 rotate-[2deg] p-4 shadow-pop sm:block lg:-right-8">
        <p className="text-xs text-ink-3">Papa · Blood pressure</p>
        <p className="tnum font-display text-2xl font-semibold">146/92 <span className="rounded-full bg-bad-soft px-2 py-0.5 align-middle font-sans text-2xs font-semibold text-bad">High</span></p>
        <svg viewBox="0 0 200 40" className="mt-2 h-8 w-full"><rect x="0" y="20" width="200" height="14" fill="#E2F4E8" /><polyline points="0,8 30,10 60,6 90,12 120,14 150,13 180,16 200,15" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
    </div>
  );
}

const QUESTIONS = [
  'Where is Papa’s last sugar report?', 'Did Mummy take her thyroid tablet?', 'Which vaccine is due for the baby?', 'What is your blood group again?',
  'When does the insurance renew?', 'Is it okay to take Combiflam with this?', 'Who was that cardiologist?', 'How many tablets are left?',
];

function Bento() {
  const tile = 'card relative overflow-hidden p-6 transition-transform hover:-translate-y-0.5';
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className={clsx(tile, 'md:col-span-4 md:row-span-2 bg-ink text-white border-ink')}>
        <LuBell className="h-6 w-6 text-lime" />
        <h3 className="mt-5 max-w-md text-3xl font-semibold">One daily plan for the whole household</h3>
        <p className="mt-2 max-w-md text-white/65">Every dose for every person on a single screen. One tap to mark taken, stock counts down, and you get warned before a strip runs out — not after.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[['Morning', '6 doses', '5 done'], ['Afternoon', '2 doses', 'due 2 pm'], ['Night', '3 doses', 'due 9:30 pm']].map(([a, b, c]) => (
            <div key={a} className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-white/50">{a}</p><p className="mt-1 font-display text-xl font-semibold">{b}</p><p className="text-xs text-lime">{c}</p></div>
          ))}
        </div>
      </div>
      <div className={clsx(tile, 'md:col-span-2')}>
        <LuQrCode className="h-6 w-6" />
        <h3 className="mt-4 text-xl font-semibold">Emergency QR card</h3>
        <p className="mt-1.5 text-sm text-ink-3">A paramedic scans it and sees blood group, allergies, medicines and who to call. No app needed.</p>
      </div>
      <div className={clsx(tile, 'md:col-span-2 bg-lime border-lime')}>
        <LuShare2 className="h-6 w-6" />
        <h3 className="mt-4 text-xl font-semibold">Doctor brief in one tap</h3>
        <p className="mt-1.5 text-sm text-ink-2">A one-page summary with trends and reports — sent as a link that expires on its own.</p>
      </div>
      <div className={clsx(tile, 'md:col-span-3')}>
        <LuFileText className="h-6 w-6" />
        <h3 className="mt-4 text-xl font-semibold">A health locker that reads your reports</h3>
        <p className="mt-1.5 text-sm text-ink-3">Upload a lab PDF or a photo. HbA1c, LDL, TSH and more are pulled into charts after you confirm them.</p>
        <div className="mt-5 flex flex-wrap gap-2">{['Lipid profile', 'Prescription — Dr. Rao', 'ECG', 'Discharge summary', 'Policy'].map((t) => <span key={t} className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium">{t}</span>)}</div>
      </div>
      <div className={clsx(tile, 'md:col-span-3')}>
        <LuShieldAlert className="h-6 w-6" />
        <h3 className="mt-4 text-xl font-semibold">Catches risky combinations</h3>
        <p className="mt-1.5 text-sm text-ink-3">Adding a medicine checks it against everything else that person takes — and their allergies. Brand names like Dolo or Ecosprin included.</p>
        <div className="mt-5 rounded-2xl bg-bad-soft p-3 text-[13px]"><b className="text-bad">Warf + Combiflam</b> <span className="text-ink-2">— raises the risk of serious bleeding. Ask your doctor first.</span></div>
      </div>
      {[
        [LuActivity, 'Vitals that mean something', 'BP, sugar, thyroid and more — charted against normal ranges, flagged when they drift.'],
        [LuSyringe, 'Vaccines on autopilot', 'Add a child’s birth date; get the full IAP schedule with reminders.'],
        [LuWallet, 'Medical spend & 80D', 'Track every rupee and export deductible expenses at tax time.'],
      ].map(([Icon, t, d]) => (
        <div key={t} className={clsx(tile, 'md:col-span-2')}><Icon className="h-6 w-6" /><h3 className="mt-4 text-xl font-semibold">{t}</h3><p className="mt-1.5 text-sm text-ink-3">{d}</p></div>
      ))}
    </div>
  );
}

const FAQ = [
  ['Is ArogyaKosh free?', 'Yes. Create an account and add your whole family at no cost.'],
  ['Who can see my family’s information?', 'Only you, when signed in. Emergency cards show a limited set of details to whoever scans them, and doctor links expire automatically. You can switch either off at any time.'],
  ['Does it diagnose or give medical advice?', 'No. It organises records, flags readings that sit outside standard ranges and highlights well-known medicine interactions so you can ask the right questions. Decisions stay with your doctor.'],
  ['Can I manage my parents who live in another city?', 'Yes — that’s exactly who it’s built for. Add them as members, track their medicines and readings, and print their emergency card for their wallet.'],
  ['How do reminders work?', 'Doses and appointments show on your Today screen, a morning email digest lists what’s due, and you can subscribe your Google or Apple Calendar to get phone alerts for every dose and visit.'],
  ['Can I take my data out?', 'Any time. Settings → Download everything gives you a complete copy. Deleting your account erases all data and files immediately.'],
];

export default function Landing() {
  const { isAuthed } = useAuth();
  const demo = useDemo();
  const primary = isAuthed ? { to: '/app', label: 'Open your dashboard' } : { to: '/register', label: 'Create your family vault' };

  return (
    <div className="overflow-x-hidden">
      <Nav />

      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2">
              <span className="h-2 w-2 rounded-full bg-lime ring-4 ring-lime/30" />Made for Indian families · Free
            </span>
            <h1 className="mt-6 text-[44px] font-bold leading-[1.02] sm:text-[64px]">
              Your family’s health, <Mark>finally</Mark> in one place.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Medicines, reports, vaccines and emergency info for your parents, your kids and you — with reminders that make sure things actually get done.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to={primary.to} size="lg" iconRight={LuArrowRight}>{primary.label}</Button>
              {!isAuthed && <Button variant="secondary" size="lg" icon={LuSparkles} loading={demo.busy} onClick={demo.start}>Explore a sample family</Button>}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
              {['No credit card', 'Works on any phone', 'Export or delete anytime'].map((t) => <li key={t} className="flex items-center gap-1.5"><LuCheck className="h-4 w-4 text-ok" />{t}</li>)}
            </ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="border-y border-line bg-surface py-5">
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex shrink-0 animate-marquee gap-3 pr-3">
            {[...QUESTIONS, ...QUESTIONS].map((q, i) => <span key={i} className="whitespace-nowrap rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink-2">{q}</span>)}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-ink-3">The questions every family asks. ArogyaKosh answers them in seconds.</p>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow">What it does</p>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Not another place to store PDFs.</h2>
          <p className="mt-4 text-lg text-ink-3">It reminds, forecasts, flags and shares — so nothing slips through when you’re juggling three generations.</p>
        </div>
        <Bento />
      </section>

      <section id="how" className="scroll-mt-20 border-y border-line bg-surface py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-xl text-4xl font-semibold sm:text-5xl">Set up in ten minutes. Useful from day one.</h2>
            <Button to={primary.to} variant="secondary" iconRight={LuArrowUpRight}>{isAuthed ? 'Go to dashboard' : 'Start now'}</Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [LuUsers, 'Add the family', 'You, your spouse, parents, kids. Blood group, allergies, conditions, doctor and insurance — the basics paramedics and doctors ask for.'],
              [LuPlus, 'Add medicines & reports', 'Type a medicine once with its timings and stock. Snap a photo of a prescription or lab report into the locker.'],
              [LuCalendarDays, 'Let it run', 'Check off doses on Today, get refill and checkup reminders, sync your calendar, and share a brief before each visit.'],
            ].map(([Icon, t, d], i) => (
              <div key={t} className="relative rounded-3xl border border-line bg-paper p-7">
                <span className="font-display text-6xl font-bold text-line">0{i + 1}</span>
                <span className="absolute right-7 top-7 grid h-11 w-11 place-items-center rounded-full bg-ink text-lime"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-3">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-12 rounded-[36px] bg-ink p-8 text-white sm:p-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-lime">For the sandwich generation</p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Caring for your parents and your kids at the same time?</h2>
            <p className="mt-5 text-lg text-white/65">You’re the one who remembers the tablets, books the tests and carries the reports. ArogyaKosh is the second brain for that job.</p>
          </div>
          <ul className="space-y-3">
            {[
              'Know if Papa took his evening dose — even from another city',
              'Spot BP or sugar creeping up before the next visit',
              'Never miss a baby vaccine or a parent’s annual checkup',
              'Hand the ER a QR card instead of a pile of papers',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime text-ink"><LuCheck className="h-3.5 w-3.5" /></span><span className="text-[15px]">{t}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="privacy" className="scroll-mt-20 mx-auto max-w-6xl px-5 pb-24">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Privacy & safety</p>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Health data deserves boring, careful engineering.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [LuLock, 'Private by default', 'Files are stored privately and only open for your signed-in session.'],
            [LuBan, 'Revocable sharing', 'Doctor links expire on their own; revoke any link or QR card instantly.'],
            [LuDownload, 'Your data, portable', 'Download everything as a file whenever you want.'],
            [LuShieldAlert, 'Honest by design', 'Flags and scores explain themselves. No diagnoses, no scare tactics.'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="card p-6"><Icon className="h-5 w-5" /><h3 className="mt-4 font-sans text-base font-semibold tracking-normal">{t}</h3><p className="mt-1.5 text-sm text-ink-3">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-line bg-surface py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 text-4xl font-semibold">Questions, answered.</h2>
          </div>
          <div className="divide-y divide-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition-transform group-open:rotate-45"><LuPlus className="h-4 w-4" /></span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-3">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl rounded-[36px] bg-lime px-8 py-16 text-center sm:px-16">
          <h2 className="mx-auto max-w-3xl text-4xl font-bold sm:text-6xl">Start with one person. Add everyone when you’re ready.</h2>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={primary.to} size="lg" iconRight={LuArrowRight}>{primary.label}</Button>
            {!isAuthed && <Button variant="secondary" size="lg" loading={demo.busy} onClick={demo.start}>Try the sample family</Button>}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 text-sm text-ink-3 sm:flex-row sm:items-center">
          <Logo size="sm" />
          <p>ArogyaKosh organises health information and does not provide medical advice. In an emergency, call 112.</p>
          <p>© {new Date().getFullYear()} ArogyaKosh</p>
        </div>
      </footer>
    </div>
  );
}
