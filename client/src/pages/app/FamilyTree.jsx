import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuDna, LuPlus, LuCalendarPlus, LuTrash2, LuBookOpen, LuInfo, LuCheck } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useHousehold } from '../../context/HouseholdContext';
import { Card, CardHeader, Avatar, Badge, Skeleton, Tabs } from '../../components/ui/Display';
import { Modal, useConfirm } from '../../components/ui/Overlay';
import { Input, Select, Switch, Field } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { firstName } from '../../lib/format';

const POS = {
  P_GF: 'Paternal grandfather', P_GM: 'Paternal grandmother', M_GF: 'Maternal grandfather', M_GM: 'Maternal grandmother',
  FATHER: 'Father', MOTHER: 'Mother', P_UNCLE_AUNT: "Father's sibling", M_UNCLE_AUNT: "Mother's sibling",
  FATHER_IN_LAW: "Spouse's father", MOTHER_IN_LAW: "Spouse's mother", SELF: 'You', SPOUSE: 'Spouse', SIBLING: 'Sibling', CHILD: 'Child',
};
const FIXED_SEX = { FATHER: 'MALE', MOTHER: 'FEMALE', P_GF: 'MALE', P_GM: 'FEMALE', M_GF: 'MALE', M_GM: 'FEMALE', FATHER_IN_LAW: 'MALE', MOTHER_IN_LAW: 'FEMALE' };
const ROWS = [
  { label: 'Grandparents', slots: ['P_GF', 'P_GM', 'M_GF', 'M_GM'] },
  { label: 'Parents', slots: ['P_UNCLE_AUNT*', 'FATHER', 'MOTHER', 'M_UNCLE_AUNT*', 'FATHER_IN_LAW', 'MOTHER_IN_LAW'] },
  { label: 'Your generation', slots: ['SIBLING*', 'SELF', 'SPOUSE'] },
  { label: 'Children', slots: ['CHILD*'] },
];
const QUICK_CONDITIONS = ['Type 2 diabetes', 'High blood pressure', 'Heart attack', 'Stroke', 'Breast cancer', 'Colon cancer', 'Prostate cancer', 'Glaucoma', 'Thalassaemia', 'Kidney disease', 'Thyroid disease'];
const ADDABLE = Object.keys(POS).filter((p) => !['SELF', 'SPOUSE'].includes(p));

function RelativeModal({ open, onClose, relative, position }) {
  const blank = { name: '', position: position || 'P_GF', sex: FIXED_SEX[position] || '', deceased: false, ageAtDeath: '', conditions: [], notes: '' };
  const [v, setV] = useState(blank);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  useEffect(() => { if (open) setV(relative ? { ...blank, ...relative, ageAtDeath: relative.ageAtDeath ?? '' } : blank); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCond = (i, patch) => setV((s) => ({ ...s, conditions: s.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const addCond = (name) => setV((s) => ({ ...s, conditions: [...s.conditions, { name, ageAtOnset: '' }] }));
  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: v.name.trim(), position: v.position, sex: FIXED_SEX[v.position] || v.sex, deceased: v.deceased,
        ageAtDeath: v.deceased && v.ageAtDeath !== '' ? Number(v.ageAtDeath) : null, notes: v.notes,
        conditions: v.conditions.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), ageAtOnset: c.ageAtOnset === '' || c.ageAtOnset === null ? null : Number(c.ageAtOnset) })),
      };
      if (relative?._id) await api.patch(`/family-tree/relatives/${relative._id}`, body);
      else await api.post('/family-tree/relatives', body);
      await invalidate('/family-tree', '/predict');
      toast.success('Family tree updated');
      onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Remove ${relative.name}?`, body: 'Their history will no longer be used for screening plans.', danger: true, confirmLabel: 'Remove' }))) return;
    try { await api.delete(`/family-tree/relatives/${relative._id}`); await invalidate('/family-tree', '/predict'); onClose(); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Modal open={open} onClose={onClose} title={relative?._id ? `Edit ${relative.name}` : 'Add a relative'} size="lg"
      description="Relatives who aren't using the app — grandparents, uncles and aunts, family who have passed away. Their health history shapes everyone's screening plan."
      footer={<>{relative?._id && <Button variant="danger-ghost" icon={LuTrash2} className="mr-auto" onClick={remove}>Remove</Button>}<Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!v.name.trim()} onClick={save}>Save</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" placeholder="e.g. Ramprasad" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
          <Select label="Who are they?" value={v.position} onChange={(e) => setV({ ...v, position: e.target.value, sex: FIXED_SEX[e.target.value] || v.sex })} options={ADDABLE.map((p) => [p, POS[p]])} />
        </div>
        {!FIXED_SEX[v.position] && <Select label="Sex" value={v.sex} onChange={(e) => setV({ ...v, sex: e.target.value })} options={[['MALE', 'Male'], ['FEMALE', 'Female']]} placeholder="Select" hint="Used for sex-specific rules (e.g. early heart disease)" />}
        <div className="flex flex-wrap items-end gap-4">
          <Switch checked={v.deceased} onChange={(x) => setV({ ...v, deceased: x })} label="Has passed away" />
          {v.deceased && <Input label="Age at death" optional type="number" className="w-36" value={v.ageAtDeath} onChange={(e) => setV({ ...v, ageAtDeath: e.target.value })} />}
        </div>
        <Field label="Health conditions" hint="The age it started matters — early heart disease or cancer changes when screening should begin.">
          <div className="space-y-2">
            {v.conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input h-10 flex-1" value={c.name} onChange={(e) => setCond(i, { name: e.target.value })} aria-label="Condition" />
                <input className="input h-10 w-28" type="number" placeholder="Age at start" value={c.ageAtOnset ?? ''} onChange={(e) => setCond(i, { ageAtOnset: e.target.value })} aria-label="Age at onset" />
                <button type="button" onClick={() => setV((s) => ({ ...s, conditions: s.conditions.filter((_, j) => j !== i) }))} className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label="Remove condition"><LuTrash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_CONDITIONS.filter((q) => !v.conditions.some((c) => c.name === q)).map((q) => (
                <button key={q} type="button" onClick={() => addCond(q)} className="h-8 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2 hover:border-ink-4">+ {q}</button>
              ))}
              <button type="button" onClick={() => addCond('')} className="h-8 rounded-full border border-dashed border-line px-3 text-xs font-medium text-ink-3">+ Other</button>
            </div>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function NodeCard({ node, onEdit }) {
  const isMember = node.kind === 'member';
  const inner = (
    <>
      <div className="flex items-center gap-2">
        {isMember ? <Avatar name={node.name} color={node.color} size="sm" /> : <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold', node.deceased ? 'bg-line text-ink-3' : 'bg-paper text-ink-2')}>{node.name[0]}</span>}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{firstName(node.name)}{node.deceased && <span className="ml-1 text-ink-4">†{node.ageAtDeath ? ` ${node.ageAtDeath}` : ''}</span>}</p>
          <p className="truncate text-[11px] text-ink-3">{POS[node.pos]}{node.age !== null && node.age !== undefined ? ` · ${node.age}` : ''}</p>
        </div>
      </div>
      {node.conditions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.conditions.slice(0, 3).map((c) => <span key={c.name} className="rounded-md bg-coral-soft px-1.5 py-0.5 text-[10px] font-medium text-[#B4232E]">{c.name}{c.onset ? ` · ${c.onset}` : ''}</span>)}
          {node.conditions.length > 3 && <span className="text-[10px] text-ink-3">+{node.conditions.length - 3}</span>}
        </div>
      )}
    </>
  );
  const cls = clsx('block w-40 shrink-0 rounded-2xl border bg-surface p-3 text-left shadow-card transition-all hover:-translate-y-0.5', isMember ? 'border-brand-100' : 'border-line', node.pos === 'SELF' && 'ring-2 ring-brand-400');
  return isMember ? <Link to={`/app/family/${node.memberId}?edit=medical`} className={cls}>{inner}</Link> : <button type="button" onClick={() => onEdit(node)} className={cls}>{inner}</button>;
}

function Tree({ nodes, onAdd, onEdit, canWrite }) {
  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2">
      <div className="min-w-[640px] space-y-3">
        {ROWS.map((row, ri) => {
          const items = row.slots.flatMap((slot) => {
            const multi = slot.endsWith('*');
            const pos = slot.replace('*', '');
            const found = nodes.filter((n) => n.pos === pos);
            if (found.length) return [...found.map((n) => ({ type: 'node', n })), ...(multi && canWrite ? [{ type: 'add', pos, small: true }] : [])];
            if (pos === 'SELF' || pos === 'SPOUSE') return [];
            return canWrite ? [{ type: 'add', pos, small: multi }] : [];
          });
          return (
            <div key={row.label}>
              {ri > 0 && <div className="mx-auto h-4 w-px bg-line" />}
              <p className="eyebrow mb-2 text-center">{row.label}</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {items.map((it, i) => (it.type === 'node'
                  ? <NodeCard key={it.n.id} node={it.n} onEdit={onEdit} />
                  : (
                    <button key={`${it.pos}-${i}`} type="button" onClick={() => onAdd(it.pos)}
                      className={clsx('grid shrink-0 place-items-center rounded-2xl border-2 border-dashed border-line text-center text-[11px] font-medium text-ink-3 hover:border-ink-4 hover:text-ink', it.small ? 'h-[60px] w-24' : 'h-[60px] w-40')}>
                      <span className="flex items-center gap-1"><LuPlus className="h-3 w-3" />{it.small ? 'Add' : POS[it.pos]}</span>
                    </button>
                  )))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS = {
  START_NOW: { tone: 'warn', label: 'Start now' },
  UNKNOWN_AGE: { tone: 'neutral', label: 'Add date of birth' },
  FUTURE: { tone: 'info', label: null },
};

function Plans({ plans }) {
  const { canWrite } = useHousehold();
  const [tab, setTab] = useState(plans[0]?.member._id);
  const [done, setDone] = useState({});
  const plan = plans.find((p) => p.member._id === tab) || plans[0];
  const schedule = async (item) => {
    try {
      const r = await api.post(`/family-tree/plan/${plan.member._id}/schedule`, { key: item.key });
      setDone((d) => ({ ...d, [`${plan.member._id}-${item.key}`]: true }));
      invalidate('/reminders', '/today');
      toast.success(r.created ? `Added "${item.test}" to appointments` : 'Already on the calendar');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  if (!plan) return null;
  return (
    <Card>
      <CardHeader title="Personal screening plans" subtitle="Built from blood relatives' conditions and the age they started" icon={LuBookOpen} />
      <Tabs className="mx-5 mt-4" value={plan.member._id} onChange={setTab}
        tabs={plans.map((p) => ({ value: p.member._id, label: p.member.pos === 'SELF' ? 'You' : firstName(p.member.name), count: p.items.length || undefined }))} />
      <div className="p-5">
        <p className="mb-4 text-xs text-ink-3">Looked at {plan.relativesConsidered.first} first-degree and {plan.relativesConsidered.second} second-degree blood relatives. Spouses and in-laws only count for their own children.</p>
        {!plan.items.length ? (
          <p className="flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok"><LuCheck className="h-4 w-4" />No extra screening from family history — follow routine age-based checkups.</p>
        ) : (
          <ul className="space-y-3">
            {plan.items.map((i) => {
              const st = STATUS[i.status];
              const scheduled = done[`${plan.member._id}-${i.key}`];
              return (
                <li key={i.key} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{i.condition}</p>
                      <p className="mt-1 font-semibold">{i.test}</p>
                      <p className="text-sm text-ink-2">{i.frequency}{i.conditional ? ` — ${i.conditional}` : ''}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label || `From age ${i.startAge} · in ${i.startsInYears} yr${i.startsInYears === 1 ? '' : 's'}`}</Badge>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{i.why}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-4"><LuInfo className="h-3 w-3" />{i.source}</span>
                    {canWrite && (scheduled
                      ? <Badge tone="ok"><LuCheck className="h-3 w-3" />On the calendar</Badge>
                      : <Button size="xs" variant="secondary" icon={LuCalendarPlus} onClick={() => schedule(i)}>{i.status === 'FUTURE' ? 'Remind me then' : 'Add to calendar'}</Button>)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default function FamilyTree() {
  const { data, loading } = useApi('/family-tree');
  const { canWrite } = useHousehold();
  const [modal, setModal] = useState({ open: false });
  const runs = useMemo(() => {
    const counts = {};
    for (const n of data?.nodes || []) for (const c of n.conditions) {
      const k = c.name.toLowerCase().includes('diabet') ? 'Diabetes' : c.name;
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] bg-ink p-6 text-white sm:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lime/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="eyebrow flex items-center gap-2 text-lime"><LuDna className="h-4 w-4" />Family Health Tree</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[40px]">What runs in your family decides when you should start checking.</h1>
          <p className="mt-3 text-[15px] text-white/70">Add grandparents and other relatives — even those who have passed away — with the conditions they had and when. ArogyaKosh turns that into a screening plan for each person, using published guidelines.</p>
          {runs.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="text-white/60">Runs in your family:</span>
              {runs.map(([k, n]) => <span key={k} className="rounded-full bg-white/10 px-3 py-1">{k} · {n} people</span>)}
            </div>
          )}
        </div>
      </div>

      {loading || !data ? <Skeleton className="h-[480px]" /> : (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-[15px] font-semibold tracking-normal">Your family tree</h2>
              {canWrite && <Button size="sm" variant="secondary" icon={LuPlus} onClick={() => setModal({ open: true })}>Add relative</Button>}
            </div>
            <Tree nodes={data.nodes} canWrite={canWrite} onAdd={(position) => setModal({ open: true, position })} onEdit={(n) => setModal({ open: true, relative: { _id: n.id, name: n.name, position: n.pos, sex: n.sex, deceased: n.deceased, ageAtDeath: n.ageAtDeath, conditions: n.conditions.map((c) => ({ name: c.name, ageAtOnset: c.onset })) } })} />
            <p className="mt-4 text-center text-xs text-ink-3">Tap a family member to edit their conditions on their profile. Red tags show conditions and the age they started.</p>
            {data.unplaced.length > 0 && <p className="mt-2 text-center text-xs text-warn">Not shown (relation "Other"): {data.unplaced.map((u) => u.name).join(', ')}.</p>}
          </Card>
          <Plans plans={data.plans} />
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3"><LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />Plans follow ADA 2024, AHA/ACC 2018, ACR 2023, USMSTF 2017, AAO, ACS, KDIGO and India's NP-NCD and NHM guidance. They tell you what to discuss and when — your doctor may advise differently based on your full history.</p>
        </div>
      )}
      <RelativeModal open={modal.open} onClose={() => setModal({ open: false })} relative={modal.relative} position={modal.position} />
    </div>
  );
}
