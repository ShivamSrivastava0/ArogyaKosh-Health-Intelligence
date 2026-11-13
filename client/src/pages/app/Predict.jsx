import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  LuHeartPulse, LuTrendingUp, LuTrendingDown, LuMinus, LuLockOpen, LuSlidersHorizontal, LuDroplets, LuFlaskConical,
  LuPill, LuInfo, LuPlus, LuChevronRight, LuBrainCircuit, LuCalendarClock,
} from 'react-icons/lu';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, CardHeader, Avatar, Badge, Empty, ErrorNote, Skeleton, ProgressBar } from '../../components/ui/Display';
import { Switch } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import InsightList from '../../components/predict/Insights';
import { ForecastChart } from '../../components/charts/Charts';
import { ForecastArt } from '../../components/illustrations';
import { BANDS } from './Vitals';
import { firstName, fmtDate, fmtClock } from '../../lib/format';

const BAND_STYLE = { LOW: { tone: 'ok', label: 'Low', color: '#14866D' }, MODERATE: { tone: 'warn', label: 'Moderate', color: '#B45309' }, HIGH: { tone: 'bad', label: 'High', color: '#D63A44' } };
const DIR = {
  IMPROVING: { icon: LuTrendingDown, tone: 'ok', label: 'Improving' },
  WORSENING: { icon: LuTrendingUp, tone: 'bad', label: 'Worsening' },
  STABLE: { icon: LuMinus, tone: 'neutral', label: 'Stable' },
};
const ageText = (a) => (a === null || a === undefined ? '—' : a >= 80 ? '80+' : a);

function RiskRadar({ rows, selected, onSelect }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 2xl:grid-cols-5">
      {rows.map((r) => {
        const b = r.cardio ? BAND_STYLE[r.cardio.band] : null;
        return (
          <button key={r.member._id} type="button" onClick={() => onSelect(r.member._id)}
            className={clsx('card min-w-[200px] p-4 text-left transition-all sm:min-w-0', selected === r.member._id ? 'border-ink ring-1 ring-ink' : 'hover:border-ink-4')}>
            <div className="flex items-center gap-2.5">
              <Avatar name={r.member.name} color={r.member.color} size="sm" />
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{r.member.isSelf ? 'You' : firstName(r.member.name)}</p><p className="text-xs text-ink-3">{r.member.age ?? "—"} yr{r.member.age === 1 ? "" : "s"}</p></div>
              {r.alerts > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1.5 text-2xs font-bold text-white">{r.alerts}</span>}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Heart age</p>
                <p className="tnum font-display text-3xl font-semibold leading-none">{r.cardio ? ageText(r.cardio.heartAge) : '—'}</p>
              </div>
              {b ? <Badge tone={b.tone}>{r.cardio.risk}% · {b.label}</Badge> : <span className="text-xs text-ink-4">{r.dataNeeds ? 'Needs data' : 'N/A'}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {r.worsening.slice(0, 2).map((w) => <Badge key={w} tone="bad"><LuTrendingUp className="h-3 w-3" />{w}</Badge>)}
              {r.improving.slice(0, 2).map((w) => <Badge key={w} tone="ok"><LuTrendingDown className="h-3 w-3" />{w}</Badge>)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, unit }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[13px]"><span className="font-medium text-ink-2">{label}</span><span className="tnum font-semibold">{value} {unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#0D9488]" />
    </label>
  );
}

function WhatIf({ memberId, cardio }) {
  const base = cardio.inputs;
  const [v, setV] = useState({ sbp: base.sbp, tc: base.tc, hdl: base.hdl, bmi: base.bmi, smoker: base.smoker });
  const [res, setRes] = useState(null);
  useEffect(() => { setV({ sbp: base.sbp, tc: base.tc, hdl: base.hdl, bmi: base.bmi, smoker: base.smoker }); setRes(null); }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => api.post(`/predict/${memberId}/simulate`, v).then(setRes).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [v, memberId]);
  const set = (k) => (x) => setV((s) => ({ ...s, [k]: x }));
  const changed = res && Math.abs(res.risk - cardio.risk) >= 0.1;
  const b = res ? BAND_STYLE[res.band] : null;

  return (
    <div className="rounded-3xl border border-line bg-gradient-to-br from-brand-50 to-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold"><LuSlidersHorizontal className="h-4 w-4 text-brand" />What-if simulator</p>
      <p className="mt-1 text-xs text-ink-3">Move the sliders to see how changes would shift the 10-year risk.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Slider label="Systolic BP" value={v.sbp} onChange={set('sbp')} min={95} max={200} unit="mmHg" />
        {base.tc ? <Slider label="Total cholesterol" value={v.tc} onChange={set('tc')} min={120} max={320} unit="mg/dL" /> : <Slider label="BMI" value={v.bmi} onChange={set('bmi')} min={17} max={40} step={0.5} />}
        {base.hdl && <Slider label="HDL (good) cholesterol" value={v.hdl} onChange={set('hdl')} min={25} max={90} unit="mg/dL" />}
        {base.smoker && <Switch checked={!v.smoker} onChange={(q) => set('smoker')(!q)} label="Quit tobacco" />}
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface p-4">
        <div className="flex-1">
          <p className="text-xs text-ink-3">Simulated 10-year risk</p>
          <p className="tnum font-display text-3xl font-semibold" style={{ color: b?.color }}>{res ? `${res.risk}%` : '…'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-3">Heart age</p>
          <p className="tnum font-display text-2xl font-semibold">{res ? ageText(res.heartAge) : '…'}</p>
        </div>
        {changed && (
          <Badge tone={res.risk < cardio.risk ? 'ok' : 'bad'} className="text-xs">{res.risk < cardio.risk ? '−' : '+'}{Math.abs(Math.round((res.risk - cardio.risk) * 10) / 10)} pts</Badge>
        )}
      </div>
    </div>
  );
}

/** 0–40% scale with low / moderate / high zones (10% and 20% cut-offs). */
function RiskScale({ risk }) {
  const pos = Math.min(risk, 40) / 40 * 100;
  return (
    <div className="mt-6">
      <div className="relative h-3 overflow-hidden rounded-full">
        <div className="absolute inset-y-0 left-0 w-1/4 bg-ok/70" />
        <div className="absolute inset-y-0 left-1/4 w-1/4 bg-warn/60" />
        <div className="absolute inset-y-0 left-1/2 w-1/2 bg-bad/60" />
      </div>
      <div className="relative h-0"><span className="absolute -top-[18px] h-6 w-1.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface" style={{ left: `${pos}%` }} /></div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3"><span>0%</span><span>Low &lt;10%</span><span>Moderate 10–20%</span><span>High 20%+</span><span>40%+</span></div>
    </div>
  );
}

function HeartCard({ report, memberId }) {
  const quick = useQuickAdd();
  const c = report.cardio;
  if (!c.available) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral-soft text-coral"><LuHeartPulse className="h-6 w-6" /></span>
          <div>
            <h3 className="font-sans text-base font-semibold tracking-normal">Heart risk & heart age</h3>
            <p className="mt-1 text-sm text-ink-3">{c.reason || `To calculate it we need ${c.missing.join(', ')}.`}</p>
            {c.missing?.includes('a blood pressure reading') && <Button size="sm" className="mt-3" icon={LuPlus} onClick={() => quick.open('vital', { member: memberId, type: 'BP' })}>Log BP</Button>}
          </div>
        </div>
      </Card>
    );
  }
  const b = BAND_STYLE[c.band];
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><LuHeartPulse className="h-4 w-4 text-coral" />Heart & stroke risk · next 10 years</p>
          <p className="mt-1 text-xs text-ink-3">{c.model}</p>
        </div>
        <Badge tone={b.tone}>{b.label} risk</Badge>
      </div>
      <div className="mt-5">
        <div>
          <p className="tnum font-display text-5xl font-semibold" style={{ color: b.color }}>{c.risk}%</p>
          <p className="mt-1 text-sm text-ink-2">chance of a heart attack or stroke in 10 years</p>
          <div className="mt-4 flex gap-6">
            <div><p className="text-xs text-ink-3">Heart age</p><p className="tnum font-display text-2xl font-semibold">{ageText(c.heartAge)}</p></div>
            <div><p className="text-xs text-ink-3">Actual age</p><p className="tnum font-display text-2xl font-semibold">{c.inputs.age}</p></div>
            {c.ageGap !== null && <div><p className="text-xs text-ink-3">Gap</p><p className={clsx('tnum font-display text-2xl font-semibold', c.ageGap > 0 ? 'text-bad' : 'text-ok')}>{c.ageGap > 0 ? '+' : ''}{c.ageGap}</p></div>}
          </div>
        </div>
        <RiskScale risk={c.risk} />
      </div>
      {c.levers.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">Biggest levers</p>
          <ul className="space-y-2">
            {c.levers.map((l) => (
              <li key={l.key} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
                <span className="flex-1">{l.label}</span>
                <span className="tnum text-ink-3">{c.risk}% → <b className="text-ok">{l.risk}%</b></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6"><WhatIf memberId={memberId} cardio={c} /></div>
      <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-4"><LuInfo className="mt-0.5 h-3 w-3 shrink-0" />{c.note} Inputs: BP {c.inputs.sbp}{c.inputs.treatedBp ? ' (on treatment)' : ''}{c.inputs.tc ? `, TC ${c.inputs.tc}, HDL ${c.inputs.hdl}` : `, BMI ${c.inputs.bmi}`}{c.inputs.diabetic ? ', diabetes' : ''}{c.inputs.smoker ? ', smoker' : ''}.</p>
    </Card>
  );
}

function ForecastCard({ f }) {
  const d = DIR[f.direction];
  const fmtV = (p) => (p.value2 != null ? `${Math.round(p.value)}/${Math.round(p.value2)}` : p.value);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{f.label}</p>
          <p className="text-xs text-ink-3">{f.n} readings · {f.confidence.toLowerCase()} confidence</p>
        </div>
        <Badge tone={d.tone}><d.icon className="h-3 w-3" />{d.label} {f.changePerMonth > 0 ? '+' : ''}{f.changePerMonth}/mo</Badge>
      </div>
      <div className="mt-3"><ForecastChart history={f.history} forecast={f.forecast} band={BANDS[f.type]} unit={f.unit} dual={f.type === 'BP'} /></div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-paper px-4 py-3"><p className="text-xs text-ink-3">Now (trend)</p><p className="tnum font-semibold">{fmtV(f.current)} <span className="text-xs font-normal text-ink-3">{f.unit}</span></p></div>
        <div className="rounded-2xl bg-brand-50 px-4 py-3"><p className="text-xs text-ink-3">In {Math.round(f.projected.days / 30)} months</p><p className="tnum font-semibold">{fmtV(f.projected)} <span className="text-xs font-normal text-ink-3">{f.unit}</span></p></div>
      </div>
      {f.crossing && <p className="mt-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn"><LuCalendarClock className="h-4 w-4" />Projected to turn <b>{f.crossing.status.toLowerCase()}</b> around {fmtDate(f.crossing.date)}</p>}
    </Card>
  );
}

function MetabolicPanel({ r }) {
  const g = r.glycaemic; const k = r.kidney; const m = r.metabolic; const d = r.diabetesRisk;
  if (!g && !k && !m && !d) return null;
  const toneCls = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' };
  return (
    <Card>
      <CardHeader title="Sugar, kidney & metabolic" icon={LuDroplets} />
      <div className="divide-y divide-line-soft px-5 pb-2">
        {g && <div className="py-3.5"><p className="text-xs text-ink-3">Blood sugar status (ADA)</p><p className={clsx('mt-0.5 font-semibold', toneCls[g.tone])}>{g.label}</p></div>}
        {d && (
          <div className="py-3.5">
            <p className="text-xs text-ink-3">Chance of developing diabetes (IDRS)</p>
            {d.score !== null ? <p className={clsx('mt-0.5 font-semibold', { HIGH: 'text-bad', MODERATE: 'text-warn', LOW: 'text-ok' }[d.band])}>{d.band.toLowerCase()} · score {d.score}/100</p>
              : <p className="mt-0.5 text-sm text-ink-3">Needs {d.missing.join(', ')}</p>}
            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
              {[['Age', d.parts.age], ['Waist', d.parts.waist], ['Activity', d.parts.activity], ['Family', d.parts.family]].map(([l, p]) => (
                <div key={l} className="rounded-lg bg-paper py-1.5"><p className="text-ink-3">{l}</p><p className="tnum font-semibold">{p ?? '?'}</p></div>
              ))}
            </div>
            {d.familyFromHousehold && <p className="mt-2 text-[11px] text-ink-3">Family history filled in automatically from your household.</p>}
          </div>
        )}
        {k && <div className="py-3.5"><p className="text-xs text-ink-3">Kidney function (eGFR, CKD-EPI 2021)</p><p className={clsx('mt-0.5 font-semibold', toneCls[k.tone])}>{k.egfr} mL/min · {k.stage} {k.label.toLowerCase()}</p><ProgressBar value={Math.min(k.egfr, 120) / 1.2} tone={k.tone === 'ok' ? 'ok' : k.tone === 'warn' ? 'warn' : 'bad'} className="mt-2" /></div>}
        {m && m.known >= 3 && <div className="py-3.5"><p className="text-xs text-ink-3">Metabolic syndrome criteria</p><p className={clsx('mt-0.5 font-semibold', m.present ? 'text-bad' : 'text-ok')}>{m.met} of 5 met{m.known < 5 ? ` (${m.known} known)` : ''}{m.present ? ' — present' : ''}</p></div>}
      </div>
    </Card>
  );
}

function PatternsCard({ patterns }) {
  if (!patterns.length) return null;
  const sorted = [...patterns].sort((a, b) => b.missRate - a.missRate);
  return (
    <Card>
      <CardHeader title="Learned dose patterns" subtitle="From the last 60 days of check-offs" icon={LuPill} />
      <ul className="divide-y divide-line-soft px-5 pb-2">
        {sorted.map((p) => (
          <li key={`${p.medicine._id}-${p.time}`} className="py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{p.medicine.name} <span className="text-ink-3">· {fmtClock(p.time)}</span></span>
              <span className={clsx('tnum font-semibold', p.missRate >= 0.25 ? 'text-bad' : 'text-ok')}>{Math.round(p.missRate * 100)}% missed</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-ink-3">
              <div>Weekdays <ProgressBar value={(p.weekdayMiss ?? 0) * 100} tone={p.weekdayMiss >= 0.25 ? 'bad' : 'ok'} className="mt-1" /></div>
              <div>Weekends <ProgressBar value={(p.weekendMiss ?? 0) * 100} tone={p.weekendMiss >= 0.25 ? 'bad' : 'ok'} className="mt-1" /></div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DataNeeds({ needs, memberId }) {
  const quick = useQuickAdd();
  if (!needs.length) return null;
  return (
    <Card className="border-dashed">
      <CardHeader title="Unlock more predictions" subtitle="Each item switches on another model" icon={LuLockOpen} />
      <ul className="px-3 pb-3">
        {needs.map((n) => {
          const inner = (<><span className="flex-1"><span className="block text-sm font-medium">{n.label}</span><span className="text-xs text-ink-3">Unlocks {n.unlocks}</span></span><LuChevronRight className="h-4 w-4 text-ink-4" /></>);
          const cls = 'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-paper';
          return <li key={n.key}>{n.to ? <Link to={n.to} className={cls}>{inner}</Link> : <button type="button" className={cls} onClick={() => quick.open('vital', { member: memberId, type: n.vital })}>{inner}</button>}</li>;
        })}
      </ul>
    </Card>
  );
}

export default function Predict() {
  const [params, setParams] = useSearchParams();
  const { data: house, loading, error, reload } = useApi('/predict');
  const rows = useMemo(() => house?.members || [], [house]);
  const fallback = rows.find((r) => r.alerts > 0)?.member._id || rows[0]?.member._id;
  const memberId = params.get('member') || fallback;
  const { data: report, loading: rLoading } = useApi(memberId ? `/predict/${memberId}` : null);

  if (error && !house) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] bg-ink p-6 text-white sm:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow flex items-center gap-2 text-lime"><LuBrainCircuit className="h-4 w-4" />ArogyaPredict engine</p>
            <h1 className="mt-3 text-[32px] font-semibold leading-tight sm:text-[44px]">See what's coming — before it does.</h1>
            <p className="mt-3 max-w-xl text-[15px] text-white/70">Validated clinical risk models plus forecasts learned from each person's own readings and habits. Updated every time you log something.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              {['Framingham heart risk', 'Heart age', 'BP & sugar forecasts', 'Kidney function', 'Diabetes risk', 'Missed-dose patterns'].map((t) => <span key={t} className="rounded-full bg-white/10 px-3 py-1.5">{t}</span>)}
            </div>
          </div>
          <ForecastArt className="mx-auto hidden w-full max-w-[300px] md:block" />
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Family risk radar</h2>
        <p className="hidden text-xs text-ink-3 sm:block">Tap a person for their full forecast</p>
      </div>
      {loading ? <div className="grid gap-3 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        : <RiskRadar rows={rows} selected={memberId} onSelect={(id) => setParams({ member: id }, { replace: true })} />}

      {rLoading || !report ? <Skeleton className="mt-8 h-96" /> : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <HeartCard report={report} memberId={memberId} />
            {report.forecasts.length > 0 ? (
              <div>
                <h3 className="mb-3 text-lg font-semibold">Forecasts</h3>
                <div className="grid gap-4">{report.forecasts.map((f) => <ForecastCard key={f.type} f={f} />)}</div>
              </div>
            ) : (
              <Card><Empty compact icon={LuTrendingUp} title="No forecasts yet" body="Log a reading at least 4 times over a couple of weeks (BP, sugar or weight) and ArogyaPredict will learn the trend and project it forward." /></Card>
            )}
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title={`What ArogyaPredict sees for ${report.member.isSelf ? 'you' : firstName(report.member.name)}`} icon={LuBrainCircuit} />
              <div className="p-2">
                {report.insights.length ? <InsightList insights={report.insights} linkTo={(i) => (i.type ? `/app/vitals?member=${memberId}&type=${i.type}` : null)} />
                  : <p className="px-3 py-4 text-sm text-ink-3">Nothing to flag right now. Keep logging and we'll keep watching.</p>}
              </div>
            </Card>
            <MetabolicPanel r={report} />
            <PatternsCard patterns={report.patterns} />
            <DataNeeds needs={report.dataNeeds} memberId={memberId} />
          </div>
        </div>
      )}

      <div className="mt-10 rounded-3xl border border-line bg-surface p-6 text-xs leading-relaxed text-ink-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><LuFlaskConical className="h-4 w-4" />How the predictions work</p>
        <p><b>Risk models</b> — 10-year cardiovascular risk and heart age: D'Agostino et al., Framingham Heart Study (Circulation, 2008). Kidney function: CKD-EPI 2021 creatinine equation. Sugar status: American Diabetes Association thresholds. Diabetes risk: Indian Diabetes Risk Score (Mohan et al., MDRF). Metabolic syndrome: harmonised criteria with Asian waist cut-offs.</p>
        <p className="mt-2"><b>Personal learning</b> — trends use a robust Theil–Sen estimator on each person's own readings, with uncertainty from residual spread; unusual readings are detected against the personal baseline; missed-dose risk is learned per medicine and time slot with Bayesian smoothing.</p>
        <p className="mt-2">These are estimates to help you act early and ask better questions. They are not a diagnosis — always discuss results with a doctor.</p>
      </div>
    </div>
  );
}
