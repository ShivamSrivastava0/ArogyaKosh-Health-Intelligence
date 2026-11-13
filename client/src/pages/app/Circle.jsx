import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  LuMailPlus, LuCopy, LuMessageCircle, LuUserMinus, LuEye, LuHandHeart, LuLogOut, LuX, LuPill, LuActivity,
  LuFileText, LuCalendarCheck, LuSyringe, LuUserPlus, LuBellRing, LuTriangleAlert, LuShieldCheck, LuClock,
} from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { Card, CardHeader, PageHeader, Avatar, Badge, ProgressBar, Skeleton, Empty } from '../../components/ui/Display';
import { Modal, ActionMenu, useConfirm } from '../../components/ui/Overlay';
import { Input, Switch } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { FamilyArt } from '../../components/illustrations';
import { relDays, fmtTime, firstName } from '../../lib/format';

const ROLE = {
  OWNER: { label: 'Owner', tone: 'ink' },
  CAREGIVER: { label: 'Caregiver', tone: 'lime' },
  VIEWER: { label: 'Viewer', tone: 'neutral' },
};

const ACT_ICON = {
  DOSE_TAKEN: LuPill, DOSE_SKIPPED: LuPill, DOSE_CLEARED: LuPill, VITAL_LOGGED: LuActivity, RECORD_ADDED: LuFileText,
  REMINDER_DONE: LuCalendarCheck, VACCINE_GIVEN: LuSyringe, MEMBER_ADDED: LuUserPlus, MISSED_DOSE: LuBellRing,
  CIRCLE_JOINED: LuHandHeart, CIRCLE_LEFT: LuLogOut, CIRCLE_REMOVED: LuUserMinus,
};

const lastSeen = (d) => {
  if (!d) return 'Not active yet';
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 5) return 'Active now';
  if (mins < 60) return `Active ${mins} min ago`;
  if (mins < 24 * 60) return `Active ${Math.round(mins / 60)} h ago`;
  return `Active ${relDays(d).toLowerCase()}`;
};

function InviteModal({ open, onClose, ownerName }) {
  const [form, setForm] = useState({ email: '', label: '', role: 'CAREGIVER' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const close = () => { setSent(null); setForm({ email: '', label: '', role: 'CAREGIVER' }); onClose(); };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post('/circle/invites', form);
      setSent(r);
      invalidate('/circle');
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const message = sent && `${ownerName} invited you to help look after our family's health on ArogyaKosh. Accept here (sign in with ${sent.invite.email}): ${sent.url}`;
  return (
    <Modal open={open} onClose={close} title={sent ? 'Invite ready' : 'Invite to your care circle'}
      description={sent ? undefined : 'Siblings, a spouse, a nurse — anyone who helps look after the family.'}
      footer={sent ? <Button onClick={close}>Done</Button> : <><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={busy} disabled={!form.email} onClick={submit}>Send invite</Button></>}>
      {sent ? (
        <div className="space-y-4 text-sm">
          <p className="text-ink-2">We emailed <b>{sent.invite.email}</b>. You can also send the link directly — it only works for that email address and expires in 7 days.</p>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-2 pl-4">
            <code className="flex-1 truncate font-mono text-xs">{sent.url}</code>
            <Button size="sm" icon={LuCopy} onClick={() => { navigator.clipboard.writeText(sent.url); toast.success('Link copied'); }}>Copy</Button>
          </div>
          <Button variant="secondary" icon={LuMessageCircle} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Send on WhatsApp</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Input label="Their email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
            <Input label="Relationship" optional placeholder="Brother, Nurse…" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['CAREGIVER', LuHandHeart, 'Caregiver', 'Marks doses, logs readings, adds medicines and records. Gets missed-dose alerts.'],
              ['VIEWER', LuEye, 'Viewer', 'Sees everything, changes nothing. Good for a home nurse or a relative abroad.'],
            ].map(([key, Icon, title, body]) => (
              <button key={key} type="button" onClick={() => setForm({ ...form, role: key })}
                className={clsx('rounded-2xl border p-4 text-left transition-colors', form.role === key ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink-4')}>
                <Icon className={clsx('h-5 w-5', form.role === key ? 'text-lime' : 'text-ink-2')} />
                <p className="mt-2 font-semibold">{title}</p>
                <p className={clsx('mt-1 text-xs leading-relaxed', form.role === key ? 'text-white/70' : 'text-ink-3')}>{body}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-3">Only you can invite or remove people, and remove family members. Everyone's actions show in the activity feed.</p>
        </div>
      )}
    </Modal>
  );
}

function People({ data, isOwner }) {
  const confirm = useConfirm();
  const setRole = async (m, role) => {
    try { await api.patch(`/circle/members/${m._id}`, { role }); await invalidate('/circle'); toast.success(`${firstName(m.user.name)} is now a ${role.toLowerCase()}`); } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async (m) => {
    if (!(await confirm({ title: `Remove ${m.user.name}?`, body: 'They will immediately lose access to this family\'s information. Their past actions stay in the activity feed.', danger: true, confirmLabel: 'Remove' }))) return;
    try { await api.delete(`/circle/members/${m._id}`); await invalidate('/circle'); toast.success('Removed'); } catch (e) { toast.error(errorMessage(e)); }
  };
  const cancel = async (inv) => {
    try { await api.delete(`/circle/invites/${inv._id}`); await invalidate('/circle'); toast.success('Invite cancelled'); } catch (e) { toast.error(errorMessage(e)); }
  };
  const rows = [{ _id: 'owner', user: data.owner, role: 'OWNER', label: 'Account owner', lastSeenAt: data.owner.lastSeenAt }, ...data.members];

  return (
    <Card>
      <CardHeader title="People" subtitle={`${rows.length} ${rows.length === 1 ? 'person looks' : 'people look'} after this family`} icon={LuHandHeart} />
      <ul className="divide-y divide-line-soft px-5 pb-2">
        {rows.map((m) => (
          <li key={m._id} className="flex items-center gap-3 py-3.5">
            <Avatar name={m.user.name} color={m.role === 'OWNER' ? 'lime' : m.role === 'CAREGIVER' ? 'sky' : 'sand'} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{m.user.name}<Badge tone={ROLE[m.role].tone}>{ROLE[m.role].label}</Badge>{m.label && m.role !== 'OWNER' && <span className="text-xs font-normal text-ink-3">{m.label}</span>}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3"><span className={clsx('h-1.5 w-1.5 rounded-full', m.lastSeenAt && Date.now() - new Date(m.lastSeenAt) < 3600000 ? 'bg-ok' : 'bg-line')} />{lastSeen(m.lastSeenAt)}</p>
            </div>
            {isOwner && m.role !== 'OWNER' && (
              <ActionMenu items={[
                { label: m.role === 'CAREGIVER' ? 'Make view-only' : 'Make caregiver', icon: m.role === 'CAREGIVER' ? LuEye : LuHandHeart, onClick: () => setRole(m, m.role === 'CAREGIVER' ? 'VIEWER' : 'CAREGIVER') },
                { label: 'Remove from circle', icon: LuUserMinus, danger: true, onClick: () => remove(m) },
              ]} />
            )}
          </li>
        ))}
        {data.invites.map((inv) => (
          <li key={inv._id} className="flex items-center gap-3 py-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-line text-ink-3"><LuMailPlus className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{inv.email}<Badge>Invited · {ROLE[inv.role].label}</Badge></p>
              <p className="mt-0.5 text-xs text-ink-3">{inv.label ? `${inv.label} · ` : ''}expires {relDays(inv.expiresAt).toLowerCase()}</p>
            </div>
            {isOwner && <Button size="xs" variant="ghost" icon={LuX} onClick={() => cancel(inv)}>Cancel</Button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function WeekReport() {
  const { data, loading } = useApi('/circle/report', { days: 7 });
  if (loading || !data) return <Skeleton className="h-72" />;
  return (
    <Card>
      <CardHeader title="This week" subtitle="Last 7 days across the family" icon={LuCalendarCheck} />
      <ul className="divide-y divide-line-soft px-5 pb-3">
        {data.people.map((p) => (
          <li key={p.member._id} className="py-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={p.member.name} color={p.member.color} size="sm" />
              <span className="flex-1 text-sm font-semibold">{p.member.isSelf ? 'You' : firstName(p.member.name)}</span>
              {p.adherence !== null ? <span className={clsx('tnum text-sm font-semibold', p.adherence >= 90 ? 'text-ok' : p.adherence >= 70 ? 'text-warn' : 'text-bad')}>{p.adherence}% doses</span> : <span className="text-xs text-ink-4">No scheduled doses</span>}
            </div>
            {p.adherence !== null && <ProgressBar value={p.adherence} tone={p.adherence >= 90 ? 'ok' : p.adherence >= 70 ? 'warn' : 'bad'} className="ml-11 mt-2 w-auto" />}
            <div className="ml-11 mt-2 space-y-1 text-xs text-ink-3">
              {p.dosesMissed > 0 && <p>{p.dosesMissed} dose{p.dosesMissed > 1 ? 's' : ''} missed or skipped{p.worstMedicine ? ` — mostly ${p.worstMedicine.name} (${p.worstMedicine.pct}%)` : ''}</p>}
              {p.flagged.map((f) => <p key={f.label + f.at} className="flex items-center gap-1.5 text-bad"><LuTriangleAlert className="h-3 w-3" />{f.label} {f.value} ({f.status.toLowerCase()})</p>)}
              {p.readings > 0 && !p.flagged.length && <p className="flex items-center gap-1.5 text-ok"><LuShieldCheck className="h-3 w-3" />{p.readings} reading{p.readings > 1 ? 's' : ''}, all in range</p>}
              {p.visits.map((v) => <p key={v}>✓ {v}</p>)}
              {p.upcoming.slice(0, 1).map((u) => <p key={u.title} className="flex items-center gap-1.5"><LuClock className="h-3 w-3" />{u.title} · {relDays(u.at)}</p>)}
            </div>
          </li>
        ))}
      </ul>
      {data.contributors.length > 0 && (
        <div className="border-t border-line-soft px-5 py-4 text-xs text-ink-3">
          <span className="font-semibold text-ink-2">Who helped: </span>{data.contributors.map((c) => `${firstName(c.name)} (${c.actions})`).join(' · ')}
        </div>
      )}
    </Card>
  );
}

function Timeline() {
  const { data, loading } = useApi('/circle/activity', { limit: 60 });
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of data?.items || []) {
      const k = relDays(a.at);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    }
    return [...map.entries()];
  }, [data]);
  if (loading) return <Skeleton className="h-96" />;
  return (
    <Card>
      <CardHeader title="Activity" subtitle="Everything anyone in the circle did — so nobody doubles a dose or wonders if it was done" icon={LuActivity} />
      {!groups.length ? <Empty compact icon={LuActivity} title="Nothing yet" body="Doses, readings and records added by anyone in the circle will show up here." /> : (
        <div className="px-5 pb-4">
          {groups.map(([day, items]) => (
            <section key={day} className="mt-3">
              <p className="eyebrow mb-1">{day}</p>
              <ol>
                {items.map((a) => {
                  const Icon = ACT_ICON[a.type] || LuActivity;
                  const system = !a.actor;
                  const body = (
                    <>
                      <span className={clsx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', system ? 'bg-warn-soft text-warn' : 'bg-paper text-ink-2')}><Icon className="h-3.5 w-3.5" /></span>
                      <span className="flex-1 text-[13px] leading-relaxed">{a.text}</span>
                      <span className="tnum shrink-0 text-xs text-ink-4">{fmtTime(a.at)}</span>
                    </>
                  );
                  return <li key={a._id}>{a.link ? <Link to={a.link} className="flex items-start gap-3 rounded-xl px-1 py-2 hover:bg-paper">{body}</Link> : <div className="flex items-start gap-3 px-1 py-2">{body}</div>}</li>;
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

function MySeat({ membership, ownerName }) {
  const { switchTo, reload } = useHousehold();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [alerts, setAlerts] = useState(membership.alerts);
  const save = async (k, v) => {
    const next = { ...alerts, [k]: v };
    setAlerts(next);
    try { await api.patch('/circle/me/alerts', { [k]: v }); } catch (e) { toast.error(errorMessage(e)); setAlerts(alerts); }
  };
  const leave = async () => {
    if (!(await confirm({ title: `Leave ${firstName(ownerName)}'s care circle?`, body: 'You will stop seeing this family\'s information and alerts. They can invite you again later.', danger: true, confirmLabel: 'Leave' }))) return;
    try { await api.post('/circle/leave'); toast.success('You left the circle'); await reload(); switchTo(user._id); } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold">Your alerts for this family</p>
      <div className="mt-4 space-y-4">
        <Switch checked={alerts.missedDose} onChange={(v) => save('missedDose', v)} label="Missed doses" description="When a dose is still unmarked an hour after its time." />
        <Switch checked={alerts.critical} onChange={(v) => save('critical', v)} label="Critical readings" description="When anyone logs a reading in the critical range." />
        <Switch checked={alerts.weekly} onChange={(v) => save('weekly', v)} label="Weekly report" description="Sunday evening summary by email." />
      </div>
      <Button variant="danger-ghost" size="sm" icon={LuLogOut} className="mt-5" onClick={leave}>Leave this circle</Button>
    </Card>
  );
}

export default function Circle() {
  const { data, loading } = useApi('/circle');
  const { isOwner, current } = useHousehold();
  const [invite, setInvite] = useState(false);
  const ownerName = data?.owner?.name || current.ownerName || '';

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] border border-line bg-gradient-to-br from-brand-50 via-surface to-sky-soft p-6 sm:p-9">
        <FamilyArt className="pointer-events-none absolute -bottom-4 right-2 hidden h-44 opacity-90 xl:block" />
        <div className="relative max-w-xl">
          <p className="eyebrow flex items-center gap-2 text-brand"><LuHandHeart className="h-4 w-4" />Care Circle</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight sm:text-[38px]">{isOwner ? 'Care for your family together' : `You're helping care for ${firstName(ownerName)}'s family`}</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            {isOwner
              ? 'Invite siblings, a spouse or a nurse. Everyone sees the same medicines and readings, marks doses from wherever they are, and gets an alert if a dose is missed.'
              : `As a ${current.role === 'VIEWER' ? 'viewer you can see everything but not change it' : 'caregiver you can mark doses, log readings and add records'}. Everything you do appears in the family's activity feed.`}
          </p>
          {isOwner && <Button className="mt-5" icon={LuMailPlus} onClick={() => setInvite(true)}>Invite someone</Button>}
        </div>
      </div>

      {loading || !data ? <Skeleton className="h-96" /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <People data={data} isOwner={isOwner} />
            {!isOwner && data.myMembership && <MySeat membership={data.myMembership} ownerName={ownerName} />}
            <WeekReport />
          </div>
          <Timeline />
        </div>
      )}
      <p className="mt-6 text-xs text-ink-3">Invites are tied to one email address and expire after 7 days. Removing someone takes effect immediately.</p>
      <InviteModal open={invite} onClose={() => setInvite(false)} ownerName={ownerName} />
    </div>
  );
}
