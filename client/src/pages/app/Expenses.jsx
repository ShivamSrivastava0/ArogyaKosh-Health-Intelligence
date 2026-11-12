import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuPlus, LuWallet, LuPencil, LuTrash2, LuFileDown, LuReceiptText } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, CardHeader, PageHeader, Empty, MemberChip, Badge, Stat, ProgressBar, Avatar } from '../../components/ui/Display';
import { ActionMenu, useConfirm } from '../../components/ui/Overlay';
import { Segmented } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import { Bars } from '../../components/charts/Charts';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../lib/constants';
import { fmtDate, inr, todayKey } from '../../lib/format';

const periodRange = (p) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case 'month': return { from: todayKey(new Date(y, m, 1)), to: todayKey(now), label: 'this month' };
    case '3m': return { from: todayKey(new Date(y, m - 2, 1)), to: todayKey(now), label: 'last 3 months' };
    case 'fy': { const fy = m >= 3 ? y : y - 1; return { from: `${fy}-04-01`, to: `${fy + 1}-03-31`, label: `FY ${fy}–${String(fy + 1).slice(2)}` }; }
    default: return { from: todayKey(new Date(y, m - 11, 1)), to: todayKey(now), label: 'last 12 months' };
  }
};

const toCsv = (rows) => {
  const head = ['Date', 'Amount', 'Category', 'For', 'Paid to', 'Payment', 'Tax deductible', 'Reimbursed', 'Note'];
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  return [head, ...rows.map((e) => [todayKey(e.date), e.amount, EXPENSE_CATEGORIES[e.category], e.member?.name || 'Household', e.vendor, PAYMENT_MODES[e.paymentMode], e.taxDeductible ? 'Yes' : 'No', e.reimbursed ? 'Yes' : 'No', e.note])]
    .map((r) => r.map(esc).join(',')).join('\n');
};

export default function Expenses() {
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const [period, setPeriod] = useState('12m');
  const range = periodRange(period);
  const toEnd = `${range.to}T23:59:59`;
  const { data: summary } = useApi('/expenses/summary', { from: range.from, to: toEnd });
  const { data, loading } = useApi('/expenses', { from: range.from, to: toEnd });
  const items = data?.items || [];
  const totals = summary?.totals;

  const monthly = useMemo(() => (summary?.byMonth || []).map((m) => {
    const [y, mo] = m.month.split('-').map(Number);
    return { label: new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' }), value: Math.round(m.total) };
  }), [summary]);
  const maxCat = Math.max(...(summary?.byCategory || []).map((c) => c.total), 1);
  // Average over the calendar months elapsed in the period, not just months with spending.
  const months = useMemo(() => {
    const [fy, fm] = range.from.split('-').map(Number);
    const end = new Date(Math.min(new Date(`${range.to}T23:59:59`), new Date()));
    return Math.max((end.getFullYear() - fy) * 12 + (end.getMonth() + 1 - fm) + 1, 1);
  }, [range.from, range.to]);

  const remove = async (e) => {
    if (!(await confirm({ title: 'Delete this expense?', body: `${inr(e.amount)} · ${EXPENSE_CATEGORIES[e.category]} · ${fmtDate(e.date)}`, danger: true, confirmLabel: 'Delete' }))) return;
    try { await api.delete(`/expenses/${e._id}`); await invalidate('/expenses'); } catch (err) { toast.error(errorMessage(err)); }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(items)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `arogyakosh-expenses-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader title="Expenses" subtitle="What the family spends on health — and what you can claim or deduct."
        actions={<>
          <Button variant="secondary" icon={LuFileDown} onClick={exportCsv} disabled={!items.length}>Export CSV</Button>
          <Button icon={LuPlus} onClick={() => quick.open('expense')}>Add expense</Button>
        </>} />
      <Segmented className="mb-6" value={period} onChange={setPeriod} options={[['month', 'This month'], ['3m', '3 months'], ['12m', '12 months'], ['fy', 'Financial year']]} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Spent ${range.label}`} value={inr(totals?.total || 0)} hint={`${totals?.count || 0} entries`} />
        <Stat label="Monthly average" value={inr((totals?.total || 0) / months)} />
        <Stat label="Tax deductible (80D)" value={inr(totals?.taxDeductible || 0)} hint="Premiums & preventive checkups" />
        <Stat label="Reimbursed / claimed" value={inr(totals?.reimbursed || 0)} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h3 className="mb-4 font-sans text-[15px] font-semibold tracking-normal">By month</h3>
          {monthly.length ? <Bars data={monthly} format={(v) => inr(v, { compact: true })} valueName="Spent" highlightLast /> : <p className="py-16 text-center text-sm text-ink-3">No expenses in this period.</p>}
        </Card>
        <Card>
          <CardHeader title="Where it goes" />
          <div className="space-y-3.5 p-5">
            {(summary?.byCategory || []).map((c) => (
              <div key={c.category}>
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="font-medium">{EXPENSE_CATEGORIES[c.category]}</span><span className="tnum font-semibold">{inr(c.total)}</span></div>
                <ProgressBar value={(c.total / maxCat) * 100} />
              </div>
            ))}
            {summary?.byMember?.length > 0 && (
              <div className="border-t border-line-soft pt-4">
                <p className="eyebrow mb-3">By person</p>
                <div className="space-y-2">
                  {summary.byMember.map((m) => (
                    <div key={m._id || 'household'} className="flex items-center gap-2.5 text-[13px]">
                      {m.color ? <Avatar name={m.name} color={m.color} size="xs" /> : <span className="h-6 w-6 rounded-full bg-paper" />}
                      <span className="flex-1">{m.name}</span><span className="tnum font-semibold">{inr(m.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!summary?.byCategory?.length && <p className="text-sm text-ink-3">Nothing yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <DataTable rows={items} loading={loading} onRowClick={(e) => quick.open('expense', { expense: e })}
          empty={<Empty icon={LuWallet} title="No expenses in this period" body="Track consultations, medicines, tests and premiums. At tax time, export the 80D-eligible list in one click."
            action={<Button size="sm" icon={LuPlus} onClick={() => quick.open('expense')}>Add expense</Button>} />}
          columns={[
            { key: 'date', header: 'Date', render: (e) => <span className="text-[13px]">{fmtDate(e.date)}</span> },
            { key: 'what', header: 'Expense', mobile: 'title', render: (e) => (
              <div className="flex items-center gap-3">
                <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper sm:grid"><LuReceiptText className="h-4 w-4" /></span>
                <div><p className="font-semibold">{e.vendor || EXPENSE_CATEGORIES[e.category]}</p><p className="text-xs text-ink-3">{EXPENSE_CATEGORIES[e.category]}{e.note ? ` · ${e.note}` : ''}</p></div>
              </div>
            ) },
            { key: 'member', header: 'For', render: (e) => <MemberChip member={e.member} /> },
            { key: 'flags', header: '', mobile: 'hide', render: (e) => <div className="flex gap-1">{e.taxDeductible && <Badge tone="lime">80D</Badge>}{e.reimbursed && <Badge tone="info">Claimed</Badge>}</div> },
            { key: 'mode', header: 'Paid via', mobile: 'hide', render: (e) => <span className="text-[13px] text-ink-3">{PAYMENT_MODES[e.paymentMode]}</span> },
            { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="tnum font-semibold">{inr(e.amount)}</span> },
            { key: 'x', header: '', align: 'right', mobile: 'end', width: 48, render: (e) => (
              <div onClick={(ev) => ev.stopPropagation()}>
                <ActionMenu items={[{ label: 'Edit', icon: LuPencil, onClick: () => quick.open('expense', { expense: e }) }, { label: 'Delete', icon: LuTrash2, danger: true, onClick: () => remove(e) }]} />
              </div>
            ) },
          ]} />
      </Card>
    </div>
  );
}
