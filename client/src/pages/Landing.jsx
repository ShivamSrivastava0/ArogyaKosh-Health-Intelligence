import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  LuBrainCircuit, LuHeartPulse, LuTrendingUp, LuCalendarClock, LuSlidersHorizontal,
  LuArrowRight, LuArrowUpRight, LuCheck, LuPill,  LuFileText, LuActivity, LuSyringe, LuShieldAlert,
  LuWallet, LuLock, LuDownload, LuBan, LuUsers, LuBell, LuSparkles, LuPlus, LuTriangleAlert, LuCalendarDays, LuMenu, LuX,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import Logo from '../components/ui/Logo';
import { HeroArt, ForecastArt, DoctorArt, EmergencyArt, PillsArt, LabArt } from '../components/illustrations';
import Button from '../components/ui/Button';

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
  const links = [['#predict', 'Predictions'], ['#features', 'Features'], ['#how', 'How it works'], ['#privacy', 'Privacy'], ['#faq', 'FAQ']];
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

const Mark = ({ children }) => <span className="relative isolate whitespace-nowrap text-brand"><span className="absolute inset-x-[-6px] bottom-[0.06em] top-[0.32em] -z-10 -rotate-1 rounded-lg bg-brand-100" />{children}</span>;

/** Hero: illustration with live-looking prediction chips floating around it. */
function PredictHero() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-10 pt-8">
      <HeroArt className="w-full" />
      <div className="card absolute -left-2 -top-2 w-48 -rotate-2 p-3 shadow-pop sm:-left-10">
        <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-brand"><LuBrainCircuit className="h-3.5 w-3.5" />ArogyaPredict</p>
        <p className="mt-1 text-sm font-semibold">Papa's heart age: 74</p>
        <p className="text-xs text-ink-3">8 yrs older · 10-yr risk 21%</p>
      </div>
      <div className="card absolute -bottom-4 -right-2 hidden w-48 rotate-2 p-3 shadow-pop sm:block lg:-right-6">
        <p className="text-xs text-ink-3">Your fasting sugar</p>
        <p className="mt-0.5 text-sm font-semibold">Trending into prediabetes</p>
        <svg viewBox="0 0 200 44" className="mt-2 h-9 w-full"><rect x="0" y="28" width="200" height="16" fill="#DCF5EC" /><polyline points="0,36 30,33 60,30 90,26 110,22" fill="none" stroke="#0B2239" strokeWidth="2.5" strokeLinecap="round" /><polyline points="110,22 150,15 200,8" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" /></svg>
        <p className="text-2xs font-semibold text-warn">Projected borderline-high by March</p>
      </div>
      <div className="card absolute -bottom-2 left-2 hidden w-56 -rotate-1 p-3 shadow-pop xl:block xl:-left-8">
        <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-info-soft text-info"><LuPill className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold">8:30 pm Glycomet</p><p className="text-xs text-ink-3">43% likely to be missed tonight — reminder set</p></div></div>
      </div>
    </div>
  );
}

const QUESTIONS = [
  'Is Papa’s BP getting worse?', 'Am I heading towards diabetes?', 'What is Mummy’s heart age?', 'Where is Papa’s last sugar report?', 'Did Mummy take her thyroid tablet?', 'Which vaccine is due for the baby?', 'What is your blood group again?',
  'When does the insurance renew?', 'Is it okay to take Combiflam with this?', 'Who was that cardiologist?', 'How many tablets are left?',
];

function Bento() {
  const tile = 'card relative overflow-hidden p-6 transition-transform hover:-translate-y-0.5';
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className={clsx(tile, 'md:col-span-4 md:row-span-2 bg-ink text-white border-ink')}>
        <LuBell className="h-6 w-6 text-lime" />
        <h3 className="mt-5 max-w-md text-3xl font-semibold">One daily plan for the whole household</h3>
        <PillsArt className="pointer-events-none absolute -right-6 -top-4 hidden h-48 opacity-95 lg:block" />
        <p className="mt-2 max-w-md text-white/65">Every dose for every person on one screen. Stock counts down, refills are forecast, and ArogyaPredict flags tonight's doses that usually get missed — before they are.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[['Morning', '6 doses', '5 done'], ['Afternoon', '2 doses', 'due 2 pm'], ['Night', '3 doses', 'due 9:30 pm']].map(([a, b, c]) => (
            <div key={a} className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-white/50">{a}</p><p className="mt-1 font-display text-xl font-semibold">{b}</p><p className="text-xs text-lime">{c}</p></div>
          ))}
        </div>
      </div>
      <div className={clsx(tile, 'md:col-span-2')}>
        <EmergencyArt className="-mx-2 -mt-2 mb-1 h-28" />
        <h3 className="text-xl font-semibold">Emergency QR card</h3>
        <p className="mt-1.5 text-sm text-ink-3">A paramedic scans it and sees blood group, allergies, medicines and who to call. No app needed.</p>
      </div>
      <div className={clsx(tile, 'md:col-span-2 bg-brand-50 border-brand-100')}>
        <DoctorArt className="-mx-2 -mt-2 mb-1 h-28" />
        <h3 className="text-xl font-semibold">Doctor brief in one tap</h3>
        <p className="mt-1.5 text-sm text-ink-2">Risk scores, forecasts, medicines and reports on one page — sent as a link that expires on its own.</p>
      </div>
      <div className={clsx(tile, 'md:col-span-3')}>
        <LabArt className="pointer-events-none absolute -right-4 -top-2 h-28 opacity-90" />
        <LuFileText className="h-6 w-6" />
        <h3 className="mt-4 max-w-[70%] text-xl font-semibold">A health locker that reads your reports</h3>
        <p className="mt-1.5 text-sm text-ink-3">Upload a lab PDF or a photo. AI pulls out HbA1c, LDL, TSH and more — and every value feeds the prediction models.</p>
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
  ['How do the predictions work — are they accurate?', 'Risk scores use published, validated clinical models (Framingham for heart risk, CKD-EPI for kidney function, ADA thresholds and the Indian Diabetes Risk Score). Forecasts are learned from each person’s own readings and show their confidence. They are estimates to help you act early — not a diagnosis.'],
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
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-14 lg:grid-cols-[1fr_1fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2">
              <LuBrainCircuit className="h-3.5 w-3.5 text-brand" />Predictive health for Indian families · Free
            </span>
            <h1 className="mt-6 text-[44px] font-bold leading-[1.02] sm:text-[62px]">
              See your family’s health problems <Mark>coming</Mark>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              ArogyaKosh predicts heart risk and heart age, forecasts BP and sugar trends, and learns which doses get missed — for your parents, your kids and you. Then it reminds, flags and shares, so you act months earlier.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to={primary.to} size="lg" iconRight={LuArrowRight}>{primary.label}</Button>
              {!isAuthed && <Button variant="secondary" size="lg" icon={LuSparkles} loading={demo.busy} onClick={demo.start}>Explore a sample family</Button>}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
              {['Validated clinical risk models', 'Learns from your own readings', 'Export or delete anytime'].map((t) => <li key={t} className="flex items-center gap-1.5"><LuCheck className="h-4 w-4 text-ok" />{t}</li>)}
            </ul>
          </div>
          <PredictHero />
        </div>
      </section>

      <section className="border-y border-line bg-surface py-5">
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex shrink-0 animate-marquee gap-3 pr-3">
            {[...QUESTIONS, ...QUESTIONS].map((q, i) => <span key={i} className="whitespace-nowrap rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink-2">{q}</span>)}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-ink-3">The questions every family asks — ArogyaKosh answers them, and predicts the ones you haven’t asked yet.</p>
      </section>

      <section id="predict" className="scroll-mt-20 px-5 pt-24">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-ink text-white">
          <div className="grid items-center gap-10 p-8 sm:p-14 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="eyebrow flex items-center gap-2 text-lime"><LuBrainCircuit className="h-4 w-4" />The ArogyaPredict engine</p>
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Not a storage app. A health forecast for everyone you love.</h2>
              <p className="mt-5 text-lg text-white/65">Every reading, report and check-off feeds models that look ahead — so you hear about rising sugar or a slipping BP months before a doctor’s visit would.</p>
              <Button to={primary.to} variant="accent" size="lg" className="mt-8" iconRight={LuArrowRight}>{isAuthed ? 'See my family’s forecast' : 'Get my family’s forecast'}</Button>
            </div>
            <div className="relative">
              <ForecastArt className="w-full" />
              <div className="absolute -bottom-4 left-4 right-4 rounded-2xl bg-white p-4 text-ink shadow-pop sm:left-10 sm:right-auto sm:w-72">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand"><LuSlidersHorizontal className="h-3.5 w-3.5" />What-if simulator</p>
                <p className="mt-1 text-sm">If Papa’s BP drops to 120:</p>
                <p className="tnum mt-1 font-display text-2xl font-semibold">21% <span className="text-base text-ink-3">→</span> <span className="text-ok">13%</span></p>
                <p className="text-xs text-ink-3">10-year heart & stroke risk</p>
              </div>
            </div>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [LuHeartPulse, 'Heart age & 10-year risk', 'Framingham cardiovascular model — the same one doctors use — turned into a heart age anyone understands.'],
              [LuTrendingUp, 'Trend forecasts', 'BP, sugar, weight and lab values projected 3–6 months ahead, with the date they’re likely to cross into an unhealthy range.'],
              [LuCalendarClock, 'Learned habits', 'Learns which doses each person tends to miss — weekends, late evenings — and flags tonight’s risky ones.'],
              [LuActivity, 'Sugar, kidney & metabolic', 'Indian Diabetes Risk Score using your family history, kidney function (eGFR), prediabetes and metabolic syndrome checks.'],
            ].map(([Icon, t, d]) => (
              <div key={t} className="bg-ink p-7"><Icon className="h-6 w-6 text-lime" /><h3 className="mt-4 font-sans text-lg font-semibold tracking-normal">{t}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow">Everything else it does</p>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Predictions that turn into action.</h2>
          <p className="mt-4 text-lg text-ink-3">Every forecast connects to something you can do today — a reminder, a refill, a checkup, a brief for the doctor.</p>
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
              'See BP or sugar trending the wrong way months before the next visit',
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
          <h2 className="mx-auto max-w-3xl text-4xl font-bold sm:text-6xl">Know what’s coming for your family’s health — starting today.</h2>
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
