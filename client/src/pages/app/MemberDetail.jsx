import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  LuPencil, LuClipboardList, LuQrCode, LuTrash2, LuPhone, LuShieldCheck, LuStethoscope, LuTriangleAlert, LuHeartPulse,
  LuPlus, LuChevronRight, LuInfo,
} from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, CardHeader, Avatar, Badge, Tabs, ScoreRing, KeyValue, PageSkeleton, ErrorNote } from '../../components/ui/Display';
import { ActionMenu, useConfirm } from '../../components/ui/Overlay';
import { Segmented, Field } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { MedicineTable } from './Medicines';
import { VitalsPanel } from './Vitals';
import { RecordList } from './Records';
import { VaccinePanel } from './Vaccines';
import { ReminderList } from './Appointments';
import { RELATIONS, GENDERS, SEVERITIES, CONDITION_STATUS, LIFESTYLE } from '../../lib/constants';
import { fmtDate, inr, daysFromNow } from '../../lib/format';

const STATE_COLOR = { good: 'bg-ok', ok: 'bg-warn', bad: 'bg-bad', unknown: 'bg-line' };

function ScoreCard({ memberId }) {
  const { data } = useApi(`/members/${memberId}/score`);
  const s = data?.score;
  if (!s) return <Card className="h-64 animate-pulse" />;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-5">
        <ScoreRing value={s.score} size={104} stroke={9} label="of 100" />
        <div>
          <p className="eyebrow">Health score</p>
          <p className="mt-1 font-display text-2xl font-semibold">{s.grade}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">Based on {s.coverage}% of the factors we look at.{s.coverage < 60 ? ' Add readings and lifestyle details for a sharper picture.' : ''}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {s.factors.map((f) => (
          <li key={f.key}>
            <div className="flex items-center gap-3">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', STATE_COLOR[f.state])} />
              <span className="w-36 shrink-0 text-[13px] font-medium">{f.label}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3" title={f.detail}>{f.detail}</span>
              <span className="tnum hidden text-xs text-ink-3 sm:inline">{f.points === null ? '—' : `${Math.round(f.points)}/${f.max}`}</span>
            </div>
            {f.tip && <p className="ml-5 mt-1 text-xs text-ink-2">→ {f.tip}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-4"><LuInfo className="mt-0.5 h-3 w-3 shrink-0" />A wellness indicator built from your own readings and habits — not a medical diagnosis.</p>
    </Card>
  );
}

/** Indian Diabetes Risk Score (Mohan et al., MDRF 2005). */
function DiabetesRisk({ member }) {
  const [waist, setWaist] = useState('');
  const [activity, setActivity] = useState('');
  const [family, setFamily] = useState('');
  const age = member.age;
  const ageScore = age < 35 ? 0 : age < 50 ? 20 : 30;
  const male = member.gender === 'MALE';
  const w = Number(waist);
  const waistScore = !waist ? null : male ? (w < 90 ? 0 : w < 100 ? 10 : 20) : (w < 80 ? 0 : w < 90 ? 10 : 20);
  const total = waistScore === null || activity === '' || family === '' ? null : ageScore + waistScore + Number(activity) + Number(family);
  const band = total === null ? null : total >= 60 ? { tone: 'bad', label: 'High risk', tip: 'Get a fasting sugar / HbA1c test soon and discuss with a doctor.' } : total >= 30 ? { tone: 'warn', label: 'Moderate risk', tip: 'A yearly sugar test and 150 min/week of activity are advised.' } : { tone: 'ok', label: 'Low risk', tip: 'Keep active and recheck every few years.' };

  return (
    <Card className="p-5">
      <h3 className="font-sans text-[15px] font-semibold tracking-normal">Diabetes risk check</h3>
      <p className="mt-1 text-xs text-ink-3">Indian Diabetes Risk Score — a validated 4-question screen. Age {age} is already counted.</p>
      <div className="mt-4 space-y-4">
        <Field label={`Waist (cm) — measure at the navel`}>
          <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} className="input h-10 max-w-[10rem]" placeholder={male ? 'e.g. 92' : 'e.g. 82'} />
        </Field>
        <Field label="Physical activity">
          <Segmented size="sm" value={activity} onChange={setActivity} options={[['0', 'Vigorous'], ['10', 'Moderate'], ['20', 'Mild'], ['30', 'None']]} />
        </Field>
        <Field label="Parents with diabetes">
          <Segmented size="sm" value={family} onChange={setFamily} options={[['0', 'Neither'], ['10', 'One'], ['20', 'Both']]} />
        </Field>
      </div>
      {band && (
        <div className={clsx('mt-5 rounded-2xl p-4', band.tone === 'bad' ? 'bg-bad-soft' : band.tone === 'warn' ? 'bg-warn-soft' : 'bg-ok-soft')}>
          <p className="flex items-baseline justify-between"><span className="font-semibold">{band.label}</span><span className="tnum font-display text-xl font-semibold">{total}<span className="text-xs text-ink-3">/100</span></span></p>
          <p className="mt-1 text-[13px] text-ink-2">{band.tip}</p>
        </div>
      )}
    </Card>
  );
}

function Overview({ member }) {
  const quick = useQuickAdd();
  const edit = (section) => quick.open('member', { memberDoc: member, section });
  const adultNoDiabetes = member.age >= 20 && !member.conditions.some((c) => /diabet/i.test(c.name));
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <ScoreCard memberId={member._id} />
        {adultNoDiabetes && <DiabetesRisk member={member} />}
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Allergies & conditions" icon={LuTriangleAlert} action={<Button size="xs" variant="ghost" icon={LuPencil} onClick={() => edit('medical')}>Edit</Button>} />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-1.5">
              {member.allergies.length ? member.allergies.map((a) => (
                <Badge key={a._id} tone={a.severity === 'SEVERE' ? 'bad' : a.severity === 'MODERATE' ? 'warn' : 'neutral'}>{a.name} · {SEVERITIES[a.severity]}</Badge>
              )) : <span className="text-[13px] text-ink-3">{member.noKnownAllergies ? 'No known allergies' : 'Allergies not recorded yet'}</span>}
            </div>
            <ul className="space-y-2">
              {member.conditions.map((c) => (
                <li key={c._id} className="flex items-center justify-between text-sm"><span className="font-medium">{c.name}</span><span className="text-xs text-ink-3">{CONDITION_STATUS[c.status]}{c.since ? ` · since ${new Date(c.since).getFullYear()}` : ''}</span></li>
              ))}
              {!member.conditions.length && <li className="text-[13px] text-ink-3">No long-term conditions recorded.</li>}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="Care team & insurance" icon={LuStethoscope} action={<Button size="xs" variant="ghost" icon={LuPencil} onClick={() => edit('care')}>Edit</Button>} />
          <dl className="divide-y divide-line-soft px-5 pb-2">
            <KeyValue label="Doctor">{member.doctor?.name && <span>{member.doctor.name}{member.doctor.specialty && <span className="block text-xs font-normal text-ink-3">{member.doctor.specialty}</span>}</span>}</KeyValue>
            {member.doctor?.phone && <KeyValue label="Clinic phone"><a href={`tel:${member.doctor.phone}`} className="link">{member.doctor.phone}</a></KeyValue>}
            {member.insurance.map((p) => {
              const d = p.validTill ? daysFromNow(p.validTill) : null;
              return (
                <KeyValue key={p._id} label="Insurance">
                  <span>{p.provider}<span className="block text-xs font-normal text-ink-3">{[p.policyNumber, p.sumInsured && `Cover ${inr(p.sumInsured, { compact: true })}`].filter(Boolean).join(' · ')}</span>
                    {d !== null && <span className={clsx('block text-xs font-medium', d < 0 ? 'text-bad' : d <= 45 ? 'text-warn' : 'text-ink-3')}>{d < 0 ? 'Lapsed' : 'Valid till'} {fmtDate(p.validTill)}</span>}</span>
                </KeyValue>
              );
            })}
            {!member.insurance.length && <KeyValue label="Insurance" />}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Emergency contacts" icon={LuPhone} action={<Button size="xs" variant="ghost" icon={LuPencil} onClick={() => edit('contacts')}>Edit</Button>} />
          <ul className="divide-y divide-line-soft px-5 pb-2">
            {member.emergencyContacts.map((c) => (
              <li key={c._id} className="flex items-center justify-between py-3 text-sm">
                <span><span className="font-medium">{c.name}</span> <span className="text-ink-3">{c.relation}</span></span>
                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-[13px] font-medium hover:bg-lime"><LuPhone className="h-3.5 w-3.5" />{c.phone}</a>
              </li>
            ))}
            {!member.emergencyContacts.length && <li className="py-4 text-[13px] text-ink-3">No emergency contact yet — add one so it shows on the QR card.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Lifestyle" icon={LuHeartPulse} action={<Button size="xs" variant="ghost" icon={LuPencil} onClick={() => edit('lifestyle')}>Edit</Button>} />
          <dl className="grid grid-cols-2 gap-x-6 px-5 pb-3">
            {['smoking', 'alcohol', 'activity', 'diet'].map((k) => <KeyValue key={k} label={k[0].toUpperCase() + k.slice(1)}>{LIFESTYLE[k][member.lifestyle?.[k]]}</KeyValue>)}
            <KeyValue label="Sleep">{member.lifestyle?.sleepHours ? `${member.lifestyle.sleepHours} h` : null}</KeyValue>
            <KeyValue label="BMI">{member.bmi}</KeyValue>
          </dl>
        </Card>
      </div>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const { data, loading, error, reload } = useApi(`/members/${id}`);
  const member = data?.member;

  useEffect(() => {
    const section = params.get('edit');
    if (section && member) {
      quick.open('member', { memberDoc: member, section });
      params.delete('edit');
      setParams(params, { replace: true });
    }
  }, [member, params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageSkeleton />;
  if (error || !member) return <ErrorNote message={error || 'Member not found'} onRetry={reload} />;

  const remove = async () => {
    if (!(await confirm({ title: `Remove ${member.name}?`, body: 'All of their medicines, readings, records, vaccines and appointments will be permanently deleted. Expenses are kept.', danger: true, confirmLabel: 'Remove permanently' }))) return;
    try {
      await api.delete(`/members/${member._id}`);
      await invalidate('/members', '/today', '/readiness', '/medicines', '/records');
      toast.success(`${member.name} removed`);
      navigate('/app/family');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const addFor = { medicines: 'medicine', vitals: 'vital', records: 'record', vaccines: 'vaccine', appointments: 'reminder' }[tab];

  return (
    <div>
      <Link to="/app/family" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink">← Family</Link>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={member.name} color={member.color} size="xl" />
          <div>
            <h1 className="text-[28px] font-semibold leading-tight sm:text-[34px]">{member.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] text-ink-3">
              <span>{RELATIONS[member.relation]}</span>
              {member.age !== null && <><span>·</span><span>{member.age} yrs</span></>}
              {member.gender && <><span>·</span><span>{GENDERS[member.gender]}</span></>}
              {member.bloodGroup && <><span>·</span><Badge tone="bad">{member.bloodGroup}</Badge></>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={LuQrCode} to={`/app/emergency?member=${member._id}`}>Emergency card</Button>
          <Button icon={LuClipboardList} to={`/app/family/${member._id}/brief`}>Doctor brief</Button>
          <ActionMenu items={[
            { label: 'Edit profile', icon: LuPencil, onClick: () => quick.open('member', { memberDoc: member, section: 'basics' }) },
            { label: 'Remove member', icon: LuTrash2, danger: true, onClick: remove, hidden: member.isSelf },
          ]} />
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between gap-4">
        <Tabs className="flex-1" value={tab} onChange={setTab} tabs={[
          { value: 'overview', label: 'Overview' }, { value: 'medicines', label: 'Medicines' }, { value: 'vitals', label: 'Vitals' },
          { value: 'records', label: 'Records' }, { value: 'vaccines', label: 'Vaccines' }, { value: 'appointments', label: 'Appointments' },
        ]} />
        {addFor && <Button size="sm" variant="secondary" icon={LuPlus} className="mb-2 hidden sm:inline-flex" onClick={() => quick.open(addFor, { member: member._id })}>Add</Button>}
      </div>

      {tab === 'overview' && <Overview member={member} />}
      {tab === 'medicines' && <Card><MedicineTable member={member._id} compact /></Card>}
      {tab === 'vitals' && <VitalsPanel memberId={member._id} />}
      {tab === 'records' && <RecordList member={member._id} />}
      {tab === 'vaccines' && <VaccinePanel member={member} />}
      {tab === 'appointments' && <ReminderList member={member._id} />}

      {tab === 'overview' && !member.emergencyContacts.length && (
        <Link to={`/app/family/${member._id}?edit=contacts`} className="mt-6 flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm">
          <LuShieldCheck className="h-5 w-5 text-warn" /><span className="flex-1">Add an emergency contact so paramedics know who to call.</span><LuChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
