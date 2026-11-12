import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import { Input, Field } from '../ui/Field';
import { StatusBadge } from '../ui/Display';
import { MemberPicker, useForm } from './common';
import { api } from '../../api/client';
import { invalidate, useApi } from '../../hooks/useApi';
import { toInputDateTime } from '../../lib/format';

const QUICK = ['BP', 'SUGAR_FASTING', 'SUGAR_PP', 'WEIGHT', 'HEART_RATE', 'SPO2', 'TEMPERATURE', 'HBA1C'];

/** Client-side mirror of the server thresholds for instant feedback. */
const preview = (type, a, b) => {
  const x = Number(a); const y = Number(b);
  if (!a) return null;
  switch (type) {
    case 'BP': if (!b) return null; if (x >= 180 || y >= 120) return 'CRITICAL'; if (x < 90 || y < 60) return 'LOW'; if (x >= 140 || y >= 90) return 'HIGH'; if (x >= 120 || y >= 80) return 'BORDERLINE'; return 'NORMAL';
    case 'SUGAR_FASTING': return x < 70 ? 'LOW' : x <= 99 ? 'NORMAL' : x <= 125 ? 'BORDERLINE' : 'HIGH';
    case 'SUGAR_PP': case 'SUGAR_RANDOM': return x < 70 ? 'LOW' : x < 140 ? 'NORMAL' : x < 200 ? 'BORDERLINE' : 'HIGH';
    case 'SPO2': return x < 90 ? 'CRITICAL' : x < 95 ? 'LOW' : 'NORMAL';
    case 'HEART_RATE': return x < 50 ? 'LOW' : x <= 100 ? 'NORMAL' : x <= 110 ? 'BORDERLINE' : 'HIGH';
    case 'TEMPERATURE': return x < 95 ? 'LOW' : x <= 99 ? 'NORMAL' : x <= 100.3 ? 'BORDERLINE' : 'HIGH';
    case 'HBA1C': return x < 5.7 ? 'NORMAL' : x < 6.5 ? 'BORDERLINE' : 'HIGH';
    default: return null;
  }
};

export default function VitalForm({ open, onClose, defaultMember, defaultType }) {
  const { data: catalog } = useApi('/vitals/types');
  const types = useMemo(() => catalog?.types || [], [catalog]);
  const init = () => ({ member: defaultMember || '', type: defaultType || 'BP', value: '', value2: '', at: toInputDateTime(new Date()), note: '' });
  const { values: v, set, setValues, errors, saving, submit } = useForm(init());

  useEffect(() => { if (open) setValues(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const def = types.find((t) => t.type === v.type);
  const status = preview(v.type, v.value, v.value2);
  const others = types.filter((t) => !QUICK.includes(t.type));

  const save = () => submit(async (s) => {
    await api.post('/vitals', { member: s.member, type: s.type, value: Number(s.value), value2: def?.dual ? Number(s.value2) : null, at: new Date(s.at), note: s.note });
    await invalidate('/vitals', '/today', '/scores', '/members');
    onClose();
  }, {
    success: 'Reading saved',
    validate: (s) => {
      const e = {};
      if (!s.member) e.member = 'Choose a family member';
      if (s.value === '') e.value = 'Enter the reading';
      if (def?.dual && s.value2 === '') e.value2 = 'Enter diastolic';
      return e;
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Log a reading" description="Readings are checked against normal ranges and charted over time."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save reading</Button></>}>
      <div className="space-y-5">
        <MemberPicker value={v.member} onChange={set('member')} error={errors.member} />
        <Field label="What did you measure?">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((t) => {
              const d = types.find((x) => x.type === t);
              return d ? (
                <button key={t} type="button" onClick={() => setValues((s) => ({ ...s, type: t, value: '', value2: '' }))}
                  className={clsx('h-9 rounded-full border px-3.5 text-[13px] font-medium', v.type === t ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-4')}>
                  {d.label}
                </button>
              ) : null;
            })}
            <select value={QUICK.includes(v.type) ? '' : v.type} onChange={(e) => e.target.value && setValues((s) => ({ ...s, type: e.target.value, value: '', value2: '' }))}
              className={clsx('h-9 rounded-full border px-3 text-[13px] font-medium', !QUICK.includes(v.type) ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2')}>
              <option value="">Lab values…</option>
              {others.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {def?.dual ? (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Systolic" type="number" inputMode="numeric" placeholder="120" value={v.value} onChange={set('value')} error={errors.value} autoFocus />
              <Input label="Diastolic" type="number" inputMode="numeric" placeholder="80" value={v.value2} onChange={set('value2')} error={errors.value2} />
            </div>
          ) : (
            <Input label={def?.label || 'Value'} type="number" step="any" inputMode="decimal" value={v.value} onChange={set('value')} error={errors.value} suffix={def?.unit} autoFocus />
          )}
          <Input label="When" type="datetime-local" value={v.at} onChange={set('at')} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-[13px]">
          <span className="text-ink-3">Normal: <span className="font-medium text-ink-2">{def?.normal || '—'}</span></span>
          {status && <StatusBadge status={status} />}
        </div>
        <Input label="Note" optional placeholder="After a walk, felt dizzy…" value={v.note} onChange={set('note')} />
      </div>
    </Modal>
  );
}
