import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  LuCheck, LuSkipForward, LuChevronLeft, LuChevronRight, LuSunrise, LuSun, LuSunset, LuMoon, LuPill, LuArrowRight,
  LuTriangleAlert, LuCircleAlert, LuInfo, LuCalendarDays, LuSyringe, LuShieldCheck, LuPlus, LuUndo2, LuX, LuBrainCircuit,
} from 'react-icons/lu';
import InsightList from '../../components/predict/Insights';
import { FamilyArt } from '../../components/illustrations';
import { useApi, setCached, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, CardHeader, Avatar, Badge, Empty, ScoreRing, ErrorNote, Skeleton, MemberChip } from '../../components/ui/Display';
import Button from '../../components/ui/Button';
import { MEAL_TIMING } from '../../lib/constants';
import { todayKey, shiftKey, keyToDate, fmtClock, fmtWeekday, greeting, firstName, relDays, fmtTime } from '../../lib/format';

const SLOTS = [
  { key: 'morning', label: 'Morning', icon: LuSunrise, test: (t) => t < '12:00' },
  { key: 'afternoon', label: 'Afternoon', icon: LuSun, test: (t) => t >= '12:00' && t < '17:00' },
  { key: 'evening', label: 'Evening', icon: LuSunset, test: (t) => t >= '17:00' && t < '21:00' },
  { key: 'night', label: 'Night', icon: LuMoon, test: (t) => t >= '21:00' },
];

const nowHm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function DoseRow({ dose, isToday, onSet }) {
  const late = isToday && dose.status === 'PENDING' && dose.time < nowHm();
  const done = dose.status === 'TAKEN';
  const skipped = dose.status === 'SKIPPED';
  return (
    <li className={clsx('flex items-center gap-3 py-3', (done || skipped) && 'opacity-70')}>
      <Avatar name={dose.member.name} color={dose.member.color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-[15px] font-semibold', done && 'line-through decoration-ink-4')}>
          {dose.medicine.name} <span className="font-normal text-ink-3">{dose.medicine.strength}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
          <span className="font-medium text-ink-2">{firstName(dose.member.name)}</span>
          <span>·</span><span className="tnum">{fmtClock(dose.time)}</span>
          {dose.medicine.mealTiming !== 'ANY' && <><span>·</span><span>{MEAL_TIMING[dose.medicine.mealTiming]}</span></>}
          {dose.medicine.dose !== 1 && <><span>·</span><span>×{dose.medicine.dose}</span></>}
          {late && <Badge tone="warn">Due</Badge>}
          {dose.medicine.stock?.low && <Badge tone="bad">{dose.medicine.stock.stock} left</Badge>}
          {dose.missRisk && <span title="ArogyaPredict learned this dose is often missed — set an alarm"><Badge tone="info"><LuBrainCircuit className="h-3 w-3" />{dose.missRisk}% likely missed</Badge></span>}
        </p>
      </div>
      {dose.status === 'PENDING' ? (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onSet(dose, 'SKIPPED')} className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink" aria-label={`Skip ${dose.medicine.name}`} title="Skip">
            <LuSkipForward className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onSet(dose, 'TAKEN')}
            className="flex h-9 items-center gap-1.5 rounded-full border border-ink bg-surface px-3.5 text-[13px] font-semibold transition-colors hover:bg-ink hover:text-white">
            <LuCheck className="h-4 w-4" /> Taken
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onSet(dose, null)} title="Undo"
          className={clsx('flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold', done ? 'bg-lime text-ink' : 'bg-paper text-ink-3')}>
          {done ? <LuCheck className="h-4 w-4" /> : <LuX className="h-4 w-4" />}
          {done ? 'Done' : 'Skipped'}
          <LuUndo2 className="ml-1 h-3.5 w-3.5 opacity-60" />
        </button>
      )}
    </li>
  );
}

const ALERT_STYLE = {
  critical: { icon: LuCircleAlert, cls: 'text-bad bg-bad-soft' },
  warning: { icon: LuTriangleAlert, cls: 'text-warn bg-warn-soft' },
  info: { icon: LuInfo, cls: 'text-info bg-info-soft' },
};

function Onboarding({ feed, onDismiss }) {
  const quick = useQuickAdd();
  const steps = [
    { label: 'Add your parents, spouse or kids', done: feed.members.length > 1, action: () => quick.open('member') },
    { label: 'Add a medicine someone takes daily', done: feed.doses.length > 0, action: () => quick.open('medicine') },
    { label: 'Fill blood group & allergies for the emergency card', done: feed.readiness.score >= 40, to: '/app/emergency' },
    { label: 'Upload a recent report or prescription', done: false, action: () => quick.open('record') },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <Card className="relative overflow-hidden border-ink bg-ink p-6 text-white">
      <button type="button" onClick={onDismiss} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Dismiss"><LuX className="h-4 w-4" /></button>
      <FamilyArt className="pointer-events-none absolute -right-4 -top-2 hidden h-40 opacity-90 xl:block" />
      <p className="eyebrow text-lime">Get set up · {done}/{steps.length}</p>
      <h2 className="mt-2 text-2xl font-semibold">Switch on predictions for your family</h2>
      <p className="mt-1 max-w-lg text-sm text-white/60">Every detail you add unlocks another model — heart age, BP and sugar forecasts, missed-dose alerts.</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:max-w-[70%]">
        {steps.map((s) => {
          const inner = (
            <>
              <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full', s.done ? 'bg-lime text-ink' : 'border border-white/30')}>{s.done && <LuCheck className="h-3.5 w-3.5" />}</span>
              <span className={clsx('flex-1 text-sm', s.done && 'text-white/50 line-through')}>{s.label}</span>
              {!s.done && <LuArrowRight className="h-4 w-4 text-white/50" />}
            </>
          );
          const cls = 'flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-left hover:bg-white/10';
          return <li key={s.label}>{s.to ? <Link to={s.to} className={cls}>{inner}</Link> : <button type="button" onClick={s.action} className={cls}>{inner}</button>}</li>;
        })}
      </ul>
    </Card>
  );
}

function PredictPanel({ predictions }) {
  const radar = predictions?.radar || [];
  const insights = predictions?.insights || [];
  if (!radar.length) return null;
  return (
    <Card className="overflow-hidden">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-lime"><LuBrainCircuit className="h-4 w-4" /></span>
              <div>
                <h2 className="font-sans text-[15px] font-semibold tracking-normal">ArogyaPredict</h2>
                <p className="text-xs text-ink-3">What's likely coming, from risk models and your family's own trends</p>
              </div>
            </div>
            <Button to="/app/predict" size="xs" variant="secondary" iconRight={LuArrowRight}>Full forecast</Button>
          </div>
          {insights.length ? <InsightList insights={insights} withMember compact linkTo={(i) => `/app/predict?member=${i.member._id}`} />
            : <p className="px-3 py-4 text-sm text-ink-3">No risks or worrying trends detected. Keep logging readings — predictions sharpen with data.</p>}
        </div>
        <div className="border-t border-line-soft bg-gradient-to-b from-brand-50 to-surface p-5 xl:border-l xl:border-t-0">
          <p className="eyebrow mb-3">Heart age · 10-yr risk</p>
          <ul className="space-y-2">
            {radar.map((r) => (
              <li key={r.member._id}>
                <Link to={`/app/predict?member=${r.member._id}`} className="flex items-center gap-3 rounded-2xl bg-surface/80 px-3 py-2.5 hover:bg-surface">
                  <Avatar name={r.member.name} color={r.member.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.member.isSelf ? 'You' : firstName(r.member.name)}</span>
                  {r.cardio ? (
                    <span className="flex items-center gap-2 text-right">
                      <span className="tnum font-display text-lg font-semibold">{r.cardio.heartAge >= 80 ? '80+' : r.cardio.heartAge}</span>
                      <Badge tone={{ LOW: 'ok', MODERATE: 'warn', HIGH: 'bad' }[r.cardio.band]}>{r.cardio.risk}%</Badge>
                    </span>
                  ) : <span className="text-xs text-ink-4">{r.member.age !== null && r.member.age < 30 ? 'Under 30' : 'Needs data'}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default function Today() {
  const { user, updateUser } = useAuth();
  const quick = useQuickAdd();
  const [date, setDate] = useState(todayKey());
  const params = { date };
  const { data: feed, loading, error, reload } = useApi('/today', params);
  const isToday = date === todayKey();

  const slots = useMemo(() => SLOTS.map((s) => ({ ...s, doses: (feed?.doses || []).filter((d) => s.test(d.time)) })).filter((s) => s.doses.length), [feed]);

  const setDose = async (dose, status) => {
    const prev = feed;
    setCached('/today', params, (f) => {
      const doses = f.doses.map((d) => (d.id === dose.id ? { ...d, status: status || 'PENDING' } : d));
      return { ...f, doses, doseSummary: { ...f.doseSummary, taken: doses.filter((d) => d.status === 'TAKEN').length } };
    });
    try {
      await api.post('/medicines/doses', { medicine: dose.medicine._id, date: dose.date, time: dose.time, status });
      if (status === 'TAKEN') toast.success(`${dose.medicine.name} — marked taken`);
      invalidate('/medicines', '/scores');
      reload();
    } catch (err) {
      setCached('/today', params, prev);
      toast.error(errorMessage(err));
    }
  };

  const dismissOnboarding = async () => {
    const res = await api.patch('/auth/me', { prefs: { onboarded: true } }).catch(() => null);
    if (res) updateUser(res.user);
  };

  if (error && !feed) return <ErrorNote message={error} onRetry={reload} />;

  const sum = feed?.doseSummary;
  const pct = sum?.total ? Math.round((sum.taken / sum.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-1.5">{fmtWeekday(new Date())}</p>
          <h1 className="text-[30px] font-semibold leading-tight sm:text-[38px]">{greeting()}, {firstName(user?.name)}</h1>
          <p className="mt-1 text-[15px] text-ink-3">
            {loading ? 'Loading your day…' : sum?.total
              ? `${sum.total - sum.taken - sum.skipped} doses left today · ${feed.alerts.length ? `${feed.alerts.length} thing${feed.alerts.length > 1 ? 's' : ''} need attention` : 'nothing urgent'}`
              : feed?.alerts.length ? `${feed.alerts.length} things need attention` : 'All calm. Nothing scheduled.'}
          </p>
        </div>
        {feed && feed.members.length > 1 && (
          <div className="flex -space-x-2">
            {feed.members.slice(0, 6).map((m) => (
              <Link key={m._id} to={`/app/family/${m._id}`} title={m.name} className="transition-transform hover:-translate-y-0.5"><Avatar name={m.name} color={m.color} ring /></Link>
            ))}
          </div>
        )}
      </div>

      {feed && !user?.prefs?.onboarded && !user?.isDemo && <Onboarding feed={feed} onDismiss={dismissOnboarding} />}

      {loading ? <Skeleton className="h-56" /> : <PredictPanel predictions={feed?.predictions} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-lime"><LuPill className="h-4 w-4" /></span>
                <div>
                  <h2 className="font-sans text-[15px] font-semibold tracking-normal">Medicine schedule</h2>
                  <p className="text-xs text-ink-3">{isToday ? 'Today' : fmtWeekday(keyToDate(date))}{sum?.total ? ` · ${sum.taken} of ${sum.total} taken` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setDate(shiftKey(date, -1))} aria-label="Previous day"><LuChevronLeft className="h-4 w-4" /></Button>
                {!isToday && <Button variant="secondary" size="xs" onClick={() => setDate(todayKey())}>Today</Button>}
                <Button variant="ghost" size="icon-sm" onClick={() => setDate(shiftKey(date, 1))} aria-label="Next day" disabled={date >= shiftKey(todayKey(), 7)}><LuChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            {sum?.total > 0 && <div className="h-1 bg-line-soft"><div className="h-full bg-lime transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>}

            {loading ? (
              <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : slots.length ? (
              <div className="divide-y divide-line-soft">
                {slots.map((s) => (
                  <section key={s.key} className="px-5 py-2">
                    <p className="flex items-center gap-2 pt-3 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-3">
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                      <span className="text-ink-4">{s.doses.filter((d) => d.status === 'TAKEN').length}/{s.doses.length}</span>
                    </p>
                    <ul className="divide-y divide-line-soft">{s.doses.map((d) => <DoseRow key={d.id} dose={d} isToday={isToday} onSet={setDose} />)}</ul>
                  </section>
                ))}
                {sum.total > 0 && sum.taken === sum.total && (
                  <p className="px-5 py-4 text-center text-sm font-medium text-ok">Every dose done for {isToday ? 'today' : 'this day'}. Nicely managed.</p>
                )}
              </div>
            ) : (
              <Empty compact icon={LuPill} title="No doses scheduled" body="Add medicines for anyone in the family and they'll show up here with reminders and stock tracking."
                action={<Button size="sm" icon={LuPlus} onClick={() => quick.open('medicine')}>Add a medicine</Button>} />
            )}
          </Card>

          <Card>
            <CardHeader title="Needs attention" subtitle="Refills, overdue checkups, readings outside the normal range" />
            <div className="p-3">
              {loading ? <Skeleton className="m-2 h-24" /> : feed.alerts.length ? (
                <ul className="space-y-1">
                  {feed.alerts.map((a) => {
                    const st = ALERT_STYLE[a.level];
                    return (
                      <li key={a.id}>
                        <Link to={a.to || '#'} className="group flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-paper">
                          <span className={clsx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', st.cls)}><st.icon className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{a.title}</p>
                            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{a.detail}</p>
                          </div>
                          {a.member && <MemberChip member={a.member} className="mt-1 hidden sm:inline-flex" />}
                          <LuChevronRight className="mt-2 h-4 w-4 text-ink-4 group-hover:text-ink" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-3 px-3 py-4 text-sm text-ink-3"><LuShieldCheck className="h-5 w-5 text-ok" /> All clear — nothing needs your attention.</div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <ScoreRing value={feed?.readiness.score} size={84} label="ready" />
              <div>
                <h3 className="font-sans text-[15px] font-semibold tracking-normal">Emergency readiness</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-3">{feed ? `${feed.readiness.done} of ${feed.readiness.total} checks done across the family.` : '…'}</p>
              </div>
            </div>
            {feed?.readiness.next.length > 0 && (
              <ul className="mt-4 space-y-1">
                {feed.readiness.next.map((i) => (
                  <li key={`${i.key}-${i.member?._id}`}>
                    <Link to={i.to} className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] hover:bg-paper">
                      <span className="h-4 w-4 rounded-full border-2 border-line" />
                      <span className="flex-1">{i.label}{i.member && <span className="text-ink-3"> — {firstName(i.member.name)}</span>}</span>
                      <LuChevronRight className="h-3.5 w-3.5 text-ink-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button to="/app/emergency" variant="secondary" size="sm" className="mt-4 w-full">Emergency cards & kit</Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-sans text-[15px] font-semibold tracking-normal">Adherence · 7 days</h3>
              <span className="tnum font-display text-2xl font-semibold">{feed?.adherence.pct ?? '—'}{feed?.adherence.pct !== null && feed?.adherence.pct !== undefined && '%'}</span>
            </div>
            <div className="mt-4 flex h-20 items-end gap-2">
              {(feed?.adherence.byDay || []).map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative w-full flex-1 overflow-hidden rounded-lg bg-line-soft">
                    <div className={clsx('absolute inset-x-0 bottom-0 rounded-lg', d.pct === null ? '' : d.pct >= 90 ? 'bg-lime' : d.pct >= 60 ? 'bg-tint-sun' : 'bg-tint-rose')} style={{ height: `${d.pct ?? 0}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-ink-4">{keyToDate(d.date).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                </div>
              ))}
            </div>
            <Link to="/app/medicines?tab=adherence" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink">Details <LuArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>

          <Card>
            <CardHeader title="Coming up" action={<Button variant="ghost" size="xs" icon={LuPlus} onClick={() => quick.open('reminder')}>Add</Button>} />
            <div className="p-3">
              {feed?.upcoming.length ? (
                <ul>
                  {feed.upcoming.map((u) => (
                    <li key={`${u.kind}-${u.id}`}>
                      <Link to={u.kind === 'VACCINE' ? '/app/vaccines' : '/app/appointments'} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-paper">
                        <div className="w-12 shrink-0 rounded-xl border border-line py-1 text-center">
                          <p className="text-[10px] font-semibold uppercase text-ink-3">{new Date(u.at).toLocaleDateString('en-IN', { month: 'short' })}</p>
                          <p className="tnum font-display text-lg font-semibold leading-tight">{new Date(u.at).getDate()}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{u.title}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-3">
                            {u.kind === 'VACCINE' ? <LuSyringe className="h-3 w-3" /> : <LuCalendarDays className="h-3 w-3" />}
                            {u.member && firstName(u.member.name)} · {relDays(u.at)}{u.kind !== 'VACCINE' ? `, ${fmtTime(u.at)}` : ''}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="px-2 py-4 text-sm text-ink-3">Nothing in the next 30 days.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
