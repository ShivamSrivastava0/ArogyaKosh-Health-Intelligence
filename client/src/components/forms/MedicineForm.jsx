import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { LuPlus, LuX, LuShieldAlert, LuSunrise, LuSun, LuSunset, LuMoon } from 'react-icons/lu';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import { Input, Select, Textarea, Field, ChipToggle, Segmented } from '../ui/Field';
import { Badge } from '../ui/Display';
import { MemberPicker, useForm, num } from './common';
import { api } from '../../api/client';
import { invalidate } from '../../hooks/useApi';
import { MED_FORMS, MEAL_TIMING, WEEKDAYS } from '../../lib/constants';
import { toInputDate, todayKey, fmtClock } from '../../lib/format';

const SLOTS = [
  { label: 'Morning', time: '08:00', icon: LuSunrise },
  { label: 'Afternoon', time: '14:00', icon: LuSun },
  { label: 'Evening', time: '19:00', icon: LuSunset },
  { label: 'Night', time: '21:30', icon: LuMoon },
];

const blank = (member) => ({
  member: member || '', name: '', strength: '', form: 'TABLET', dose: 1, times: ['08:00'], everyDay: true, daysOfWeek: [],
  mealTiming: 'AFTER_FOOD', startDate: todayKey(), endDate: '', stock: '', refillAt: 5, expiryDate: '', prescribedBy: '', reason: '', notes: '', asNeeded: false,
});

const fromMed = (m) => ({
  ...blank(m.member?._id || m.member),
  ...m,
  member: m.member?._id || m.member,
  everyDay: !m.daysOfWeek?.length,
  asNeeded: !m.times?.length,
  startDate: toInputDate(m.startDate), endDate: toInputDate(m.endDate), expiryDate: toInputDate(m.expiryDate),
  stock: m.stock ?? '',
});

export default function MedicineForm({ open, onClose, medicine, defaultMember }) {
  const editing = Boolean(medicine?._id);
  const { values: v, set, setValues, errors, saving, submit } = useForm(medicine ? fromMed(medicine) : blank(defaultMember));
  const [custom, setCustom] = useState('');
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (open) setValues(medicine ? fromMed(medicine) : blank(defaultMember));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live safety check while typing the name.
  useEffect(() => {
    if (!open || !v.member || v.name.trim().length < 3) { setWarnings([]); return undefined; }
    const t = setTimeout(() => {
      api.post('/medicines/check', { member: v.member, name: v.name.trim(), excludeId: medicine?._id })
        .then((r) => setWarnings(r.warnings))
        .catch(() => setWarnings([]));
    }, 450);
    return () => clearTimeout(t);
  }, [v.name, v.member, open, medicine?._id]);

  const toggleTime = (t) => set('times')(v.times.includes(t) ? v.times.filter((x) => x !== t) : [...v.times, t].sort());

  const save = () => submit(async (s) => {
    const body = {
      member: s.member, name: s.name.trim(), strength: s.strength, form: s.form, dose: Number(s.dose) || 1,
      times: s.asNeeded ? [] : s.times, daysOfWeek: s.everyDay ? [] : s.daysOfWeek.map(Number),
      mealTiming: s.mealTiming, startDate: s.startDate || null, endDate: s.endDate || null, stock: num(s.stock), refillAt: num(s.refillAt) ?? 5,
      expiryDate: s.expiryDate || null, prescribedBy: s.prescribedBy, reason: s.reason, notes: s.notes,
    };
    if (editing) await api.patch(`/medicines/${medicine._id}`, body);
    else await api.post('/medicines', body);
    await invalidate('/medicines', '/today', '/members', '/scores');
    onClose();
  }, {
    success: editing ? 'Medicine updated' : 'Medicine added — reminders are on',
    validate: (s) => {
      const e = {};
      if (!s.member) e.member = 'Choose who takes this';
      if (!s.name.trim()) e.name = 'Enter the medicine name';
      if (!s.asNeeded && !s.times.length) e.times = 'Pick at least one time, or mark as needed';
      if (!s.everyDay && !s.daysOfWeek.length) e.daysOfWeek = 'Pick the days';
      return e;
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${medicine.name}` : 'Add a medicine'} description="Doses appear on Today with one-tap check-off. Stock counts down automatically." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>{editing ? 'Save changes' : 'Add medicine'}</Button></>}>
      <div className="space-y-5">
        <MemberPicker value={v.member} onChange={set('member')} label="Who takes it?" error={errors.member} />

        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
          <Input label="Medicine name" placeholder="e.g. Glycomet, Dolo 650" value={v.name} onChange={set('name')} error={errors.name} autoFocus={!editing} />
          <Input label="Strength" optional placeholder="500 mg" value={v.strength} onChange={set('strength')} />
          <Select label="Form" value={v.form} onChange={set('form')} options={MED_FORMS} />
        </div>

        {warnings.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-bad/25 bg-bad-soft/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-bad"><LuShieldAlert className="h-4 w-4" />Check with a doctor or pharmacist</p>
            {warnings.map((w) => (
              <div key={w.title} className="text-[13px] leading-relaxed text-ink-2">
                <Badge tone={w.severity === 'HIGH' ? 'bad' : w.severity === 'MODERATE' ? 'warn' : 'neutral'} className="mr-2">{w.severity.toLowerCase()}</Badge>
                <span className="font-medium text-ink">{w.title}.</span> {w.effect} {w.advice}
              </div>
            ))}
          </div>
        )}

        <Field label="When" error={errors.times}>
          <div className="space-y-3">
            <Segmented value={v.asNeeded ? 'prn' : 'sched'} onChange={(x) => set('asNeeded')(x === 'prn')} options={{ sched: 'On a schedule', prn: 'Only when needed' }} />
            {!v.asNeeded && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SLOTS.map((s) => {
                    const on = v.times.includes(s.time);
                    return (
                      <button key={s.time} type="button" onClick={() => toggleTime(s.time)}
                        className={clsx('flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-4')}>
                        <s.icon className={clsx('h-4 w-4', on ? 'text-lime' : 'text-ink-3')} />
                        <span><span className="block text-[13px] font-semibold">{s.label}</span><span className={clsx('text-xs', on ? 'text-white/70' : 'text-ink-3')}>{fmtClock(s.time)}</span></span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {v.times.filter((t) => !SLOTS.some((s) => s.time === t)).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
                      {fmtClock(t)}<button type="button" onClick={() => toggleTime(t)} aria-label="Remove time"><LuX className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input type="time" value={custom} onChange={(e) => setCustom(e.target.value)} className="input h-9 w-32 text-sm" aria-label="Custom time" />
                    <Button size="sm" variant="secondary" icon={LuPlus} disabled={!custom} onClick={() => { if (!v.times.includes(custom)) toggleTime(custom); setCustom(''); }}>Time</Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Units per dose" type="number" min="0.25" step="0.25" value={v.dose} onChange={set('dose')} suffix={v.form === 'SYRUP' ? 'ml' : 'unit'} />
                  <Select label="Take" value={v.mealTiming} onChange={set('mealTiming')} options={MEAL_TIMING} className="sm:col-span-2" />
                </div>
                <Field label="Days" error={errors.daysOfWeek}>
                  <div className="space-y-2">
                    <Segmented size="sm" value={v.everyDay ? 'all' : 'some'} onChange={(x) => set('everyDay')(x === 'all')} options={{ all: 'Every day', some: 'Specific days' }} />
                    {!v.everyDay && <ChipToggle values={v.daysOfWeek} onChange={set('daysOfWeek')} options={WEEKDAYS.map((d, i) => [i, d])} />}
                  </div>
                </Field>
              </>
            )}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" value={v.startDate} onChange={set('startDate')} />
          <Input label="End date" optional type="date" value={v.endDate} onChange={set('endDate')} hint="Leave empty for ongoing medicines" />
        </div>

        <div className="rounded-2xl border border-line bg-paper/60 p-4">
          <p className="mb-3 text-sm font-semibold">Stock & refill</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Units in hand" optional type="number" min="0" value={v.stock} onChange={set('stock')} hint="We'll count down as doses are taken" />
            <Input label="Remind me at" type="number" min="0" value={v.refillAt} onChange={set('refillAt')} suffix="left" />
            <Input label="Expiry" optional type="date" value={v.expiryDate} onChange={set('expiryDate')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Prescribed by" optional placeholder="Dr. Menon" value={v.prescribedBy} onChange={set('prescribedBy')} />
          <Input label="For" optional placeholder="Blood pressure" value={v.reason} onChange={set('reason')} />
        </div>
        <Textarea label="Notes" optional rows={2} value={v.notes} onChange={set('notes')} placeholder="e.g. Crush and mix with water" />
      </div>
    </Modal>
  );
}
