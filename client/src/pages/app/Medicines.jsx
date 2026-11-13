import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuPlus, LuPill, LuPackage, LuPencil, LuPause, LuPlay, LuTrash2, LuShieldCheck, LuShieldAlert } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, PageHeader, Badge, Empty, MemberChip, Tabs, ProgressBar, ErrorNote, Avatar, Stat } from '../../components/ui/Display';
import { ActionMenu, Modal, useConfirm } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';
import { Input, Segmented } from '../../components/ui/Field';
import DataTable from '../../components/ui/DataTable';
import { Bars } from '../../components/charts/Charts';
import { PillsArt } from '../../components/illustrations';
import { MEAL_TIMING, MED_FORMS, WEEKDAYS } from '../../lib/constants';
import { fmtClock, fmtDate, daysFromNow, firstName, keyToDate, toInputDate } from '../../lib/format';

export function MemberFilter({ value, onChange }) {
  const { members } = useFamily();
  if (members.length < 2) return null;
  return (
    <Segmented value={value} onChange={onChange} size="sm"
      options={[['', 'Everyone'], ...members.map((m) => [m._id, m.isSelf ? 'Me' : firstName(m.name)])]} />
  );
}

function RefillModal({ med, onClose }) {
  const [qty, setQty] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setQty(''); setExpiry(toInputDate(med?.expiryDate)); }, [med]);
  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/medicines/${med._id}/refill`, { quantity: Number(qty), expiryDate: expiry || undefined });
      await invalidate('/medicines', '/today');
      toast.success(`${med.name} restocked`);
      onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open={Boolean(med)} onClose={onClose} title={`Restock ${med?.name || ''}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!(Number(qty) > 0)} onClick={save}>Add to stock</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-ink-3">Currently {med?.stock ?? 0} in hand.</p>
        <div className="flex flex-wrap gap-1.5">
          {[10, 15, 30, 60, 90].map((n) => <Button key={n} size="xs" variant={Number(qty) === n ? 'primary' : 'secondary'} onClick={() => setQty(String(n))}>+{n}</Button>)}
        </div>
        <Input label="Units bought" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        <Input label="Expiry of new strip" optional type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </div>
    </Modal>
  );
}

function StockCell({ m }) {
  const s = m.stockInfo;
  if (!s) return <span className="text-xs text-ink-4">Not tracked</span>;
  const pct = s.daysLeft === null ? 100 : Math.min((s.daysLeft / 30) * 100, 100);
  return (
    <div className="w-36">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className={clsx('tnum font-semibold', s.low && 'text-bad')}>{s.stock} left</span>
        {s.daysLeft !== null && <span className="text-xs text-ink-3">~{s.daysLeft}d</span>}
      </div>
      <ProgressBar value={pct} tone={s.low ? 'bad' : pct < 40 ? 'warn' : 'ok'} className="mt-1.5" />
    </div>
  );
}

/** Medicine table — reused on member profiles. */
export function MedicineTable({ member, active = true, compact }) {
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const [refill, setRefill] = useState(null);
  const { data, loading, error, reload } = useApi('/medicines', { member: member || undefined, active: active ? 'true' : 'false' });
  const items = data?.items || [];

  const toggle = async (m) => {
    try {
      await api.patch(`/medicines/${m._id}`, { active: !m.active });
      await invalidate('/medicines', '/today', '/members');
      toast.success(m.active ? `${m.name} stopped — history kept` : `${m.name} resumed`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async (m) => {
    if (!(await confirm({ title: `Delete ${m.name}?`, body: 'This removes the medicine and its dose history. To keep history, stop it instead.', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/medicines/${m._id}`);
      await invalidate('/medicines', '/today', '/members');
      toast.success('Deleted');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    {
      key: 'name', header: 'Medicine', mobile: 'title', render: (m) => (
        <div className="flex items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper sm:grid"><LuPill className="h-4 w-4 text-ink-2" /></span>
          <div className="min-w-0">
            <p className="font-semibold">{m.name} <span className="font-normal text-ink-3">{m.strength}</span></p>
            <p className="text-xs text-ink-3">{[MED_FORMS[m.form], m.reason, m.prescribedBy].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      ),
    },
    !member && { key: 'member', header: 'For', render: (m) => <MemberChip member={m.member} /> },
    {
      key: 'schedule', header: 'Schedule', render: (m) => (
        <div>
          <div className="flex flex-wrap gap-1">
            {m.times.length ? m.times.map((t) => <span key={t} className="tnum rounded-md bg-paper px-1.5 py-0.5 text-xs font-medium">{fmtClock(t)}</span>) : <Badge>As needed</Badge>}
          </div>
          <p className="mt-1 text-xs text-ink-3">{m.dose !== 1 ? `${m.dose} units · ` : ''}{MEAL_TIMING[m.mealTiming]}{m.daysOfWeek?.length ? ` · ${m.daysOfWeek.map((d) => WEEKDAYS[d]).join(', ')}` : ''}</p>
        </div>
      ),
    },
    active && { key: 'stock', header: 'Stock', render: (m) => <StockCell m={m} /> },
    {
      key: 'expiry', header: active ? 'Expiry' : 'Stopped', mobile: compact ? 'hide' : undefined, render: (m) => {
        if (!active) return <span className="text-xs text-ink-3">{fmtDate(m.endDate)}</span>;
        if (!m.expiryDate) return <span className="text-xs text-ink-4">—</span>;
        const d = daysFromNow(m.expiryDate);
        return <span className={clsx('text-xs', d < 0 ? 'font-semibold text-bad' : d <= 30 ? 'font-semibold text-warn' : 'text-ink-3')}>{d < 0 ? 'Expired' : fmtDate(m.expiryDate, { day: undefined })}</span>;
      },
    },
    {
      key: 'actions', header: '', align: 'right', mobile: 'end', stop: true, width: 120, render: (m) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {active && m.stockInfo && <Button size="xs" variant="secondary" icon={LuPackage} onClick={() => setRefill(m)}>Refill</Button>}
          <ActionMenu items={[
            { label: 'Edit', icon: LuPencil, onClick: () => quick.open('medicine', { medicine: m }) },
            { label: m.active ? 'Stop medicine' : 'Resume', icon: m.active ? LuPause : LuPlay, onClick: () => toggle(m) },
            { label: 'Delete', icon: LuTrash2, danger: true, onClick: () => remove(m) },
          ]} />
        </div>
      ),
    },
  ].filter(Boolean);

  if (error) return <div className="p-4"><ErrorNote message={error} onRetry={reload} /></div>;

  return (
    <>
      <DataTable columns={columns} rows={items} loading={loading} onRowClick={(m) => quick.open('medicine', { medicine: m })}
        rowClassName={(m) => (m.stockInfo?.low && active ? 'bg-bad-soft/30' : '')}
        empty={<Empty compact art={PillsArt} title={active ? 'No active medicines' : 'Nothing stopped'}
          body={active ? 'Add daily medicines, vitamins or short courses. Doses show on Today with reminders.' : 'Medicines you stop keep their history here.'}
          action={active && <Button size="sm" icon={LuPlus} onClick={() => quick.open('medicine', { member })}>Add medicine</Button>} />} />
      <RefillModal med={refill} onClose={() => setRefill(null)} />
    </>
  );
}

function Adherence({ member }) {
  const [days, setDays] = useState('30');
  const { data, loading } = useApi('/medicines/adherence', { days, member: member || undefined });
  const { byId } = useFamily();
  const chart = useMemo(() => (data?.byDay || []).map((d) => ({
    label: keyToDate(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    value: d.pct ?? 0,
    color: d.pct === null ? '#EDF2F5' : d.pct >= 90 ? '#2DD4BF' : d.pct >= 60 ? '#FFEDA6' : '#FFD3DE',
  })), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-3">Share of scheduled doses marked as taken.</p>
        <Segmented size="sm" value={days} onChange={setDays} options={[['7', '7 days'], ['30', '30 days'], ['90', '90 days']]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Adherence" value={data?.pct !== null && data?.pct !== undefined ? `${data.pct}%` : '—'} tone={data?.pct >= 90 ? 'ok' : data?.pct >= 70 ? 'warn' : data?.pct !== null ? 'bad' : undefined} hint="80%+ is the clinical target" />
        <Stat label="Taken" value={data?.taken ?? '—'} />
        <Stat label="Skipped" value={data?.skipped ?? '—'} />
        <Stat label="Missed (not marked)" value={data?.missed ?? '—'} tone={data?.missed ? 'warn' : undefined} />
      </div>
      <Card className="p-5">
        <h3 className="mb-4 font-sans text-[15px] font-semibold tracking-normal">Daily adherence</h3>
        {loading ? <div className="h-[220px]" /> : <Bars data={chart} format={(v) => `${v}%`} valueName="Taken" />}
      </Card>
      <Card>
        <DataTable rows={(data?.byMedicine || []).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101))} rowKey="_id"
          columns={[
            { key: 'name', header: 'Medicine', mobile: 'title', render: (m) => <span className="font-semibold">{m.name}</span> },
            { key: 'member', header: 'For', render: (m) => <MemberChip member={byId.get(String(m.member))} /> },
            { key: 'doses', header: 'Doses', render: (m) => <span className="tnum text-[13px]">{m.taken} / {m.expected}</span> },
            { key: 'pct', header: 'Adherence', width: 220, render: (m) => (
              <div className="flex items-center gap-3"><ProgressBar value={m.pct} tone={m.pct >= 90 ? 'ok' : m.pct >= 70 ? 'warn' : 'bad'} className="w-28" /><span className="tnum text-[13px] font-semibold">{m.pct ?? '—'}%</span></div>
            ) },
          ]}
          empty={<Empty compact icon={LuPill} title="No scheduled doses in this period" />} />
      </Card>
    </div>
  );
}

function Safety() {
  const { data, loading } = useApi('/medicines/safety');
  if (loading) return <div className="h-40" />;
  const unrec = data?.unrecognised || [];
  const coverageNote = data && (
    <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-ink-2">
      <p><b>What was checked:</b> {data.checked} active medicine{data.checked === 1 ? '' : 's'} against {data.coverage.interactionRules} well-documented interaction rules, duplicate ingredients and {data.coverage.allergyClasses} allergy groups ({data.coverage.brands} Indian brand names recognised).</p>
      {unrec.length > 0 && <p className="mt-2 text-warn"><b>Not checked</b> (name not recognised): {unrec.map((u) => u.name).join(', ')}. Ask your pharmacist about these.</p>}
      <p className="mt-2 text-ink-3">This is a safety net, not a complete drug database — no warning does not prove a combination is safe.</p>
    </div>
  );
  if (!data?.items.length) {
    return <div className="space-y-4"><Card><Empty icon={LuShieldCheck} title="No known interactions found" body="Nothing in our curated list matched. Always confirm new prescriptions with your pharmacist." /></Card>{coverageNote}</div>;
  }
  return (
    <div className="space-y-4">
      {coverageNote}
      {data.items.map(({ member, warnings }) => (
        <Card key={member._id} className="p-5">
          <div className="mb-3 flex items-center gap-2.5"><Avatar name={member.name} color={member.color} size="sm" /><h3 className="font-sans text-[15px] font-semibold tracking-normal">{member.name}</h3></div>
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.title + w.effect} className="flex gap-3 rounded-2xl bg-paper p-4">
                <LuShieldAlert className={clsx('mt-0.5 h-5 w-5 shrink-0', w.severity === 'HIGH' ? 'text-bad' : w.severity === 'MODERATE' ? 'text-warn' : 'text-ink-3')} />
                <div>
                  <p className="text-sm font-semibold">{w.title} <Badge tone={w.severity === 'HIGH' ? 'bad' : w.severity === 'MODERATE' ? 'warn' : 'neutral'} className="ml-1">{w.kind.toLowerCase()} · {w.severity.toLowerCase()}</Badge></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{w.effect} <span className="text-ink-3">{w.advice}</span></p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export default function Medicines() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'active';
  const [member, setMember] = useState(params.get('member') || '');
  const quick = useQuickAdd();
  const { data: safety } = useApi('/medicines/safety');
  const flagCount = safety?.items.reduce((n, i) => n + i.warnings.length, 0) || 0;

  return (
    <div>
      <PageHeader title="Medicines" subtitle="Everything the family takes, with stock forecasts, refill reminders and interaction checks."
        actions={<Button icon={LuPlus} onClick={() => quick.open('medicine', { member })}>Add medicine</Button>} />
      <Tabs className="mb-5" value={tab} onChange={(t) => setParams(t === 'active' ? {} : { tab: t })}
        tabs={[{ value: 'active', label: 'Active' }, { value: 'adherence', label: 'Adherence' }, { value: 'safety', label: 'Safety check', count: flagCount || undefined }, { value: 'stopped', label: 'Stopped' }]} />
      {tab !== 'safety' && <div className="mb-5"><MemberFilter value={member} onChange={setMember} /></div>}
      {tab === 'active' && <Card><MedicineTable member={member} /></Card>}
      {tab === 'stopped' && <Card><MedicineTable member={member} active={false} /></Card>}
      {tab === 'adherence' && <Adherence member={member} />}
      {tab === 'safety' && <Safety />}
    </div>
  );
}
