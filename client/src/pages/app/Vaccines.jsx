import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuPlus, LuSyringe, LuCheck, LuPencil, LuTrash2, LuWandSparkles, LuInfo } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, PageHeader, Empty, Badge, Avatar, ProgressBar, Skeleton } from '../../components/ui/Display';
import { ActionMenu, useConfirm } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';
import { fmtDate, relDays, firstName, todayKey } from '../../lib/format';

const STATUS = {
  GIVEN: { tone: 'ok', label: 'Given' }, OVERDUE: { tone: 'bad', label: 'Overdue' }, DUE: { tone: 'warn', label: 'Due soon' }, UPCOMING: { tone: 'neutral', label: 'Upcoming' },
};

/** Vaccination timeline for one member. Reused on member profiles. */
export function VaccinePanel({ member }) {
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const { data, loading } = useApi('/vaccines', { member: member._id });
  const [showGiven, setShowGiven] = useState(false);
  const items = data?.items || [];
  const counts = useMemo(() => items.reduce((a, v) => ({ ...a, [v.status]: (a[v.status] || 0) + 1 }), {}), [items]);
  const visible = items.filter((v) => showGiven || v.status !== 'GIVEN');

  const markGiven = async (v) => {
    try {
      await api.patch(`/vaccines/${v._id}`, { givenDate: todayKey() });
      await invalidate('/vaccines', '/today', '/readiness', '/scores');
      toast.success(`${v.name} marked as given`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const generate = async () => {
    try {
      const r = await api.post(`/vaccines/generate/${member._id}`);
      await invalidate('/vaccines', '/today', '/readiness');
      toast.success(r.created ? `Added ${r.created} vaccines to the schedule` : 'Schedule already up to date');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async (v) => {
    if (!(await confirm({ title: `Remove ${v.name}?`, body: 'This entry will be deleted from the schedule.', danger: true, confirmLabel: 'Remove' }))) return;
    try { await api.delete(`/vaccines/${v._id}`); await invalidate('/vaccines', '/today', '/readiness'); } catch (e) { toast.error(errorMessage(e)); }
  };

  if (loading) return <Skeleton className="h-60" />;

  if (!items.length) {
    return (
      <Card>
        <Empty icon={LuSyringe} title="No vaccinations recorded"
          body={member.dob ? (member.age < 18 ? 'Build the recommended IAP immunisation schedule from date of birth, then tick off what has been given.' : 'Add recommended adult vaccines — yearly flu, Td booster and age-based ones.') : 'Add a date of birth to generate the recommended schedule.'}
          action={<div className="flex flex-wrap justify-center gap-2">
            {member.dob && <Button size="sm" icon={LuWandSparkles} onClick={generate}>Build schedule</Button>}
            <Button size="sm" variant="secondary" icon={LuPlus} onClick={() => quick.open('vaccine', { member: member._id })}>Add manually</Button>
          </div>} />
      </Card>
    );
  }

  const given = counts.GIVEN || 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4 sm:col-span-2">
          <div className="flex items-baseline justify-between"><p className="text-[13px] font-medium text-ink-3">Completed</p><p className="tnum text-sm font-semibold">{given}/{items.length}</p></div>
          <ProgressBar value={(given / items.length) * 100} tone="lime" className="mt-3 h-2" />
        </div>
        <div className="card p-4"><p className="text-[13px] font-medium text-ink-3">Overdue</p><p className={clsx('tnum mt-1 font-display text-2xl font-semibold', counts.OVERDUE && 'text-bad')}>{counts.OVERDUE || 0}</p></div>
        <div className="card p-4"><p className="text-[13px] font-medium text-ink-3">Due in 30 days</p><p className="tnum mt-1 font-display text-2xl font-semibold">{counts.DUE || 0}</p></div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3">
          <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" className="accent-ink" checked={showGiven} onChange={(e) => setShowGiven(e.target.checked)} />Show given ({given})</label>
          <div className="flex gap-2">
            {member.dob && <Button size="xs" variant="ghost" icon={LuWandSparkles} onClick={generate}>Refresh schedule</Button>}
            <Button size="xs" variant="secondary" icon={LuPlus} onClick={() => quick.open('vaccine', { member: member._id })}>Add</Button>
          </div>
        </div>
        <ol className="relative px-5 py-2">
          {visible.map((v, i) => {
            const st = STATUS[v.status];
            return (
              <li key={v._id} className="relative flex gap-4 py-3">
                {i < visible.length - 1 && <span className="absolute left-[11px] top-9 h-[calc(100%-18px)] w-px bg-line" />}
                <span className={clsx('relative mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                  v.status === 'GIVEN' ? 'border-ok bg-ok text-white' : v.status === 'OVERDUE' ? 'border-bad bg-bad-soft' : v.status === 'DUE' ? 'border-warn bg-warn-soft' : 'border-line bg-surface')}>
                  {v.status === 'GIVEN' && <LuCheck className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{v.name}<span className="font-normal text-ink-3">{v.dose}</span><Badge tone={st.tone}>{st.label}</Badge></p>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {v.givenDate ? `Given ${fmtDate(v.givenDate)}${v.provider ? ` · ${v.provider}` : ''}` : v.dueDate ? `Due ${fmtDate(v.dueDate)} · ${relDays(v.dueDate)}` : 'No due date'}
                    {v.notes && ` · ${v.notes}`}
                  </p>
                </div>
                {v.status !== 'GIVEN' && <Button size="xs" variant="secondary" icon={LuCheck} onClick={() => markGiven(v)}>Given</Button>}
                <ActionMenu items={[
                  { label: 'Edit', icon: LuPencil, onClick: () => quick.open('vaccine', { vaccine: v }) },
                  { label: 'Remove', icon: LuTrash2, danger: true, onClick: () => remove(v) },
                ]} />
              </li>
            );
          })}
          {!visible.length && <li className="py-8 text-center text-sm text-ink-3">All caught up. Every vaccine on the list is done.</li>}
        </ol>
      </Card>
    </div>
  );
}

export default function Vaccines() {
  const { members, self } = useFamily();
  const [params, setParams] = useSearchParams();
  const kids = members.filter((m) => m.age !== null && m.age < 18);
  const fallback = kids[0] || self || members[0];
  const current = members.find((m) => m._id === params.get('member')) || fallback;
  const quick = useQuickAdd();

  return (
    <div>
      <PageHeader title="Vaccines" subtitle="Childhood schedule from date of birth (IAP), plus adult boosters and yearly flu shots."
        actions={<Button icon={LuPlus} onClick={() => quick.open('vaccine', { member: current?._id })}>Add vaccine</Button>} />
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {members.map((m) => (
          <button key={m._id} type="button" onClick={() => setParams({ member: m._id })}
            className={clsx('flex h-11 shrink-0 items-center gap-2.5 rounded-full border pl-1.5 pr-4 text-sm font-medium', current?._id === m._id ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-4')}>
            <Avatar name={m.name} color={m.color} size="sm" />{m.isSelf ? 'Me' : firstName(m.name)}
            {m.age !== null && m.age < 18 && <span className={clsx('text-xs', current?._id === m._id ? 'text-white/60' : 'text-ink-3')}>{m.age < 1 ? 'baby' : `${m.age}y`}</span>}
          </button>
        ))}
      </div>
      {current && <VaccinePanel key={current._id} member={current} />}
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
        <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />Schedules follow the Indian Academy of Pediatrics recommendations and common adult guidance. Your paediatrician or physician may advise different timing — always follow their advice.
      </p>
    </div>
  );
}
