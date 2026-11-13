import { useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuPlus, LuCalendarDays, LuCheck, LuPencil, LuTrash2, LuRefreshCw, LuCopy, LuMapPin, LuStethoscope, LuCalendarCheck } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, PageHeader, Empty, MemberChip, Badge, Tabs, Skeleton } from '../../components/ui/Display';
import { ActionMenu, Modal, useConfirm } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';
import { MemberFilter } from './Medicines';
import { EmptyArt } from '../../components/illustrations';
import { REMINDER_TYPES, REPEAT_SHORT } from '../../lib/constants';
import { fmtTime, relDays, daysFromNow, fmtDate } from '../../lib/format';

function CalendarSync({ open, onClose }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async (rotate) => {
    setLoading(true);
    try { setUrl((await api.post('/auth/calendar', { rotate })).url); } catch (e) { toast.error(errorMessage(e)); } finally { setLoading(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Sync with your calendar" description="Appointments, vaccine due dates and medicine alarms in Google Calendar, Apple Calendar or Outlook."
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      {!url ? (
        <div className="space-y-4 text-sm text-ink-2">
          <p>We'll create a private link that your calendar app checks every few hours. Anyone with the link can see these events, so keep it to yourself.</p>
          <Button loading={loading} onClick={() => load(false)} icon={LuCalendarCheck}>Create my calendar link</Button>
        </div>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-2 pl-4">
            <code className="flex-1 truncate font-mono text-xs">{url}</code>
            <Button size="sm" icon={LuCopy} onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied'); }}>Copy</Button>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-ink-2">
            <li><b>Google Calendar</b> (computer): Other calendars → <b>+</b> → From URL → paste the link.</li>
            <li><b>iPhone</b>: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.</li>
            <li><b>Outlook</b>: Add calendar → Subscribe from web.</li>
          </ol>
          <button type="button" onClick={() => load(true)} className="flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-bad"><LuRefreshCw className="h-3.5 w-3.5" />Reset link (old one stops working)</button>
        </div>
      )}
    </Modal>
  );
}

/** Reused on member profiles. */
export function ReminderList({ member, status = 'UPCOMING' }) {
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const { data, loading } = useApi('/reminders', { member: member || undefined, status });
  const items = useMemo(() => {
    const list = data?.items || [];
    return status === 'DONE' ? [...list].sort((a, b) => new Date(b.completedAt || b.dueAt) - new Date(a.completedAt || a.dueAt)) : list;
  }, [data, status]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of items) {
      const overdue = status === 'UPCOMING' && daysFromNow(r.dueAt) < 0;
      const k = overdue ? 'Overdue' : new Date(r.dueAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()];
  }, [items, status]);

  const complete = async (r) => {
    try {
      const res = await api.post(`/reminders/${r._id}/complete`, {});
      await invalidate('/reminders', '/today', '/scores');
      toast.success(res.next ? `Done. Next one on ${fmtDate(res.next.dueAt)}` : 'Marked as done');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete this appointment?', body: r.title, danger: true, confirmLabel: 'Delete' }))) return;
    try { await api.delete(`/reminders/${r._id}`); await invalidate('/reminders', '/today'); } catch (e) { toast.error(errorMessage(e)); }
  };

  if (loading) return <Skeleton className="h-48" />;
  if (!items.length) {
    return (
      <Card><Empty art={EmptyArt} title={status === 'DONE' ? 'Nothing completed yet' : 'No upcoming appointments'}
        body={status === 'DONE' ? 'Completed visits and checkups show here — handy for the doctor brief.' : 'Add doctor visits, annual checkups, dental cleanings or lab tests. Repeating ones roll forward on their own.'}
        action={status !== 'DONE' && <Button size="sm" icon={LuPlus} onClick={() => quick.open('reminder', { member })}>Add appointment</Button>} /></Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([label, list]) => (
        <section key={label}>
          <p className={clsx('eyebrow mb-2', label === 'Overdue' && 'text-bad')}>{label}</p>
          <Card className="divide-y divide-line-soft">
            {list.map((r) => {
              const overdue = status === 'UPCOMING' && daysFromNow(r.dueAt) < 0;
              const d = new Date(status === 'DONE' ? r.completedAt || r.dueAt : r.dueAt);
              return (
                <div key={r._id} className="flex items-center gap-4 p-4 sm:px-5">
                  <div className={clsx('w-14 shrink-0 rounded-2xl border py-1.5 text-center', overdue ? 'border-bad/30 bg-bad-soft text-bad' : 'border-line')}>
                    <p className="text-[10px] font-semibold uppercase">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                    <p className="tnum font-display text-xl font-semibold leading-tight">{d.getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{r.title}
                      <Badge>{REMINDER_TYPES[r.type]}</Badge>
                      {r.repeat !== 'NONE' && <Badge tone="lime"><LuRefreshCw className="h-2.5 w-2.5" />{REPEAT_SHORT[r.repeat]}</Badge>}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                      <MemberChip member={r.member} />
                      <span>{relDays(r.dueAt)}, {fmtTime(r.dueAt)}</span>
                      {r.doctor && <span className="flex items-center gap-1"><LuStethoscope className="h-3 w-3" />{r.doctor}</span>}
                      {r.location && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.location)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink"><LuMapPin className="h-3 w-3" />{r.location}</a>}
                    </p>
                    {r.notes && <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{r.notes}</p>}
                  </div>
                  {status === 'UPCOMING' && <Button size="sm" variant={overdue ? 'primary' : 'secondary'} icon={LuCheck} onClick={() => complete(r)} className="hidden sm:inline-flex">Done</Button>}
                  <ActionMenu items={[
                    { label: 'Mark done', icon: LuCheck, onClick: () => complete(r), hidden: status !== 'UPCOMING' },
                    { label: 'Edit', icon: LuPencil, onClick: () => quick.open('reminder', { reminder: r }) },
                    { label: 'Delete', icon: LuTrash2, danger: true, onClick: () => remove(r) },
                  ]} />
                </div>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}

export default function Appointments() {
  const quick = useQuickAdd();
  const [tab, setTab] = useState('UPCOMING');
  const [member, setMember] = useState('');
  const [sync, setSync] = useState(false);
  return (
    <div>
      <PageHeader title="Appointments" subtitle="Doctor visits, checkups and tests for everyone — with reminders that roll forward automatically."
        actions={<>
          <Button variant="secondary" icon={LuCalendarCheck} onClick={() => setSync(true)}>Calendar sync</Button>
          <Button icon={LuPlus} onClick={() => quick.open('reminder', { member })}>Add</Button>
        </>} />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ value: 'UPCOMING', label: 'Upcoming' }, { value: 'DONE', label: 'Completed' }]} />
      <div className="mb-6"><MemberFilter value={member} onChange={setMember} /></div>
      <ReminderList member={member} status={tab} />
      <CalendarSync open={sync} onClose={() => setSync(false)} />
    </div>
  );
}
