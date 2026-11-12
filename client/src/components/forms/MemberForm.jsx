import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { Drawer } from '../ui/Overlay';
import Button from '../ui/Button';
import { Input, Select, Textarea, Switch, Segmented, Field } from '../ui/Field';
import { Tabs } from '../ui/Display';
import { useForm, num } from './common';
import { api } from '../../api/client';
import { invalidate } from '../../hooks/useApi';
import { BLOOD_GROUPS, GENDERS, RELATIONS, SEVERITIES, CONDITION_STATUS, LIFESTYLE, MEMBER_COLORS } from '../../lib/constants';
import { toInputDate } from '../../lib/format';

const SECTIONS = [
  { value: 'basics', label: 'Basics' },
  { value: 'medical', label: 'Medical' },
  { value: 'contacts', label: 'Emergency contacts' },
  { value: 'care', label: 'Doctor & insurance' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

const TINT = { lime: 'bg-tint-lime', sky: 'bg-tint-sky', peach: 'bg-tint-peach', lilac: 'bg-tint-lilac', mint: 'bg-tint-mint', sun: 'bg-tint-sun', rose: 'bg-tint-rose', sand: 'bg-tint-sand' };

const blank = () => ({
  name: '', relation: 'FATHER', dob: '', gender: '', bloodGroup: '', heightCm: '', weightKg: '', phone: '', color: '',
  allergies: [], noKnownAllergies: false, conditions: [], emergencyContacts: [],
  doctor: { name: '', specialty: '', phone: '', clinic: '' }, insurance: [],
  lifestyle: { smoking: '', alcohol: '', activity: '', diet: '', sleepHours: '' }, organDonor: false, notes: '',
});

const fromMember = (m) => ({
  ...blank(),
  ...m,
  dob: toInputDate(m.dob),
  heightCm: m.heightCm ?? '', weightKg: m.weightKg ?? '',
  doctor: { ...blank().doctor, ...(m.doctor || {}) },
  lifestyle: { ...blank().lifestyle, ...(m.lifestyle || {}), sleepHours: m.lifestyle?.sleepHours ?? '' },
  conditions: (m.conditions || []).map((c) => ({ ...c, since: toInputDate(c.since) })),
  insurance: (m.insurance || []).map((i) => ({ ...i, validTill: toInputDate(i.validTill), sumInsured: i.sumInsured ?? '' })),
});

/** Editable list of small objects (allergies, contacts, insurance...). */
function ListEditor({ items, onChange, empty, render, addLabel, make }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">{empty}</p>}
      {items.map((it, i) => (
        <div key={it._id || i} className="relative rounded-2xl border border-line p-4 pr-12">
          {render(it, (patch) => update(i, patch))}
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label="Remove">
            <LuTrash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={LuPlus} onClick={() => onChange([...items, make()])}>{addLabel}</Button>
    </div>
  );
}

export default function MemberForm({ open, onClose, member, section = 'basics', onSaved }) {
  const editing = Boolean(member?._id);
  const [tab, setTab] = useState(section);
  const { values: v, set, setValues, errors, saving, submit } = useForm(member ? fromMember(member) : blank());

  useEffect(() => {
    if (open) { setValues(member ? fromMember(member) : blank()); setTab(section || 'basics'); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setNested = (key, sub) => (e) => setValues((s) => ({ ...s, [key]: { ...s[key], [sub]: e?.target ? e.target.value : e } }));

  const save = () => submit(async (s) => {
    const body = {
      name: s.name.trim(), dob: s.dob || null, gender: s.gender, bloodGroup: s.bloodGroup,
      heightCm: num(s.heightCm), weightKg: num(s.weightKg), phone: s.phone,
      allergies: s.allergies.filter((a) => a.name?.trim()), noKnownAllergies: s.noKnownAllergies && !s.allergies.length,
      conditions: s.conditions.filter((c) => c.name?.trim()).map((c) => ({ ...c, since: c.since || null })),
      emergencyContacts: s.emergencyContacts.filter((c) => c.name?.trim() && c.phone?.trim()),
      doctor: s.doctor, insurance: s.insurance.filter((i) => i.provider?.trim()).map((i) => ({ ...i, validTill: i.validTill || null, sumInsured: num(i.sumInsured) })),
      lifestyle: { ...s.lifestyle, sleepHours: num(s.lifestyle.sleepHours) }, organDonor: s.organDonor, notes: s.notes,
    };
    if (!member?.isSelf) body.relation = s.relation;
    if (s.color) body.color = s.color;
    const res = editing ? await api.patch(`/members/${member._id}`, body) : await api.post('/members', body);
    await invalidate('/members', '/today', '/readiness', '/scores', '/vaccines');
    onSaved?.(res.member, res);
    onClose();
    return res;
  }, {
    success: editing ? 'Profile saved' : 'Family member added',
    validate: (s) => (s.name.trim().length < 1 ? { name: 'Enter a name' } : {}),
  });

  return (
    <Drawer open={open} onClose={onClose} width="max-w-2xl"
      title={editing ? (member.isSelf ? 'Your health profile' : `${member.name}'s profile`) : 'Add a family member'}
      description={editing ? 'Everything here powers the emergency card and doctor brief.' : 'Add parents, kids, spouse — anyone you look after.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>{editing ? 'Save' : 'Add member'}</Button></>}>
      <Tabs tabs={SECTIONS} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'basics' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={v.name} onChange={set('name')} error={errors.name} autoFocus={!editing} />
            {member?.isSelf ? <Input label="Relation" value="You" disabled /> : (
              <Select label="Relation" value={v.relation} onChange={set('relation')} options={Object.entries(RELATIONS).filter(([k]) => k !== 'SELF')} />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Date of birth" type="date" value={v.dob} onChange={set('dob')} hint={!editing ? 'Used to build the vaccine schedule' : undefined} />
            <Select label="Gender" value={v.gender} onChange={set('gender')} options={GENDERS} placeholder="Select" />
            <Select label="Blood group" value={v.bloodGroup} onChange={set('bloodGroup')} options={BLOOD_GROUPS} placeholder="Unknown" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Height" type="number" value={v.heightCm} onChange={set('heightCm')} suffix="cm" />
            <Input label="Weight" type="number" step="0.1" value={v.weightKg} onChange={set('weightKg')} suffix="kg" />
            <Input label="Phone" optional type="tel" value={v.phone} onChange={set('phone')} />
          </div>
          <Field label="Colour">
            <div className="flex gap-2">
              {MEMBER_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set('color')(c)} aria-label={c}
                  className={clsx('h-8 w-8 rounded-full border-2', TINT[c], (v.color || member?.color) === c ? 'border-ink' : 'border-transparent')} />
              ))}
            </div>
          </Field>
        </div>
      )}

      {tab === 'medical' && (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Allergies</p>
              {!v.allergies.length && <Switch checked={v.noKnownAllergies} onChange={set('noKnownAllergies')} label="No known allergies" />}
            </div>
            <ListEditor items={v.allergies} onChange={set('allergies')} addLabel="Add allergy" empty="No allergies recorded." make={() => ({ name: '', severity: 'MODERATE', reaction: '' })}
              render={(a, up) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="Penicillin, peanuts…" value={a.name} onChange={(e) => up({ name: e.target.value })} aria-label="Allergy" />
                  <Select value={a.severity} onChange={(e) => up({ severity: e.target.value })} options={SEVERITIES} aria-label="Severity" />
                  <Input placeholder="Reaction (rash, swelling)" value={a.reaction} onChange={(e) => up({ reaction: e.target.value })} aria-label="Reaction" />
                </div>
              )} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Long-term conditions</p>
            <ListEditor items={v.conditions} onChange={set('conditions')} addLabel="Add condition" empty="None recorded." make={() => ({ name: '', status: 'ACTIVE', since: '' })}
              render={(c, up) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="Type 2 diabetes" value={c.name} onChange={(e) => up({ name: e.target.value })} aria-label="Condition" />
                  <Select value={c.status} onChange={(e) => up({ status: e.target.value })} options={CONDITION_STATUS} aria-label="Status" />
                  <Input type="date" value={c.since} onChange={(e) => up({ since: e.target.value })} aria-label="Since" />
                </div>
              )} />
          </div>
          <Switch checked={v.organDonor} onChange={set('organDonor')} label="Registered organ donor" description="Shown on the emergency card." />
          <Textarea label="Notes for doctors & paramedics" optional rows={3} value={v.notes} onChange={set('notes')} placeholder="Uses a pacemaker, hard of hearing, prefers Hindi…" />
        </div>
      )}

      {tab === 'contacts' && (
        <ListEditor items={v.emergencyContacts} onChange={set('emergencyContacts')} addLabel="Add contact" empty="Add at least one person who should be called in an emergency."
          make={() => ({ name: '', relation: '', phone: '' })}
          render={(c, up) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Name" value={c.name} onChange={(e) => up({ name: e.target.value })} aria-label="Name" />
              <Input placeholder="Relation" value={c.relation} onChange={(e) => up({ relation: e.target.value })} aria-label="Relation" />
              <Input placeholder="+91…" type="tel" value={c.phone} onChange={(e) => up({ phone: e.target.value })} aria-label="Phone" />
            </div>
          )} />
      )}

      {tab === 'care' && (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold">Family doctor</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Name" value={v.doctor.name} onChange={setNested('doctor', 'name')} />
              <Input label="Speciality" value={v.doctor.specialty} onChange={setNested('doctor', 'specialty')} />
              <Input label="Phone" type="tel" value={v.doctor.phone} onChange={setNested('doctor', 'phone')} />
              <Input label="Clinic / hospital" value={v.doctor.clinic} onChange={setNested('doctor', 'clinic')} />
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Health insurance</p>
            <ListEditor items={v.insurance} onChange={set('insurance')} addLabel="Add policy" empty="No policies saved. We'll remind you before renewal."
              make={() => ({ provider: '', policyNumber: '', sumInsured: '', validTill: '', helpline: '' })}
              render={(p, up) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Insurer & plan" value={p.provider} onChange={(e) => up({ provider: e.target.value })} aria-label="Insurer" />
                  <Input placeholder="Policy number" value={p.policyNumber} onChange={(e) => up({ policyNumber: e.target.value })} aria-label="Policy number" />
                  <Input placeholder="Sum insured" type="number" prefix="₹" value={p.sumInsured} onChange={(e) => up({ sumInsured: e.target.value })} aria-label="Sum insured" />
                  <Input type="date" value={p.validTill} onChange={(e) => up({ validTill: e.target.value })} aria-label="Valid till" hint="Valid till" />
                  <Input placeholder="Claims helpline" type="tel" value={p.helpline} onChange={(e) => up({ helpline: e.target.value })} aria-label="Helpline" className="sm:col-span-2" />
                </div>
              )} />
          </div>
        </div>
      )}

      {tab === 'lifestyle' && (
        <div className="space-y-6">
          {[['smoking', 'Tobacco / smoking'], ['alcohol', 'Alcohol'], ['activity', 'Physical activity'], ['diet', 'Diet']].map(([k, label]) => (
            <Field key={k} label={label}>
              <Segmented value={v.lifestyle[k]} onChange={setNested('lifestyle', k)} options={LIFESTYLE[k]} />
            </Field>
          ))}
          <Input label="Average sleep" type="number" step="0.5" min="0" max="24" value={v.lifestyle.sleepHours} onChange={setNested('lifestyle', 'sleepHours')} suffix="hours" className="max-w-[12rem]" />
          <p className="text-xs text-ink-3">Lifestyle answers feed the health score. They're never shared on the emergency card.</p>
        </div>
      )}
    </Drawer>
  );
}
