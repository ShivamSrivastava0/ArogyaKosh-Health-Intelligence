import { useEffect } from 'react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import { Input, Select, Textarea, Switch } from '../ui/Field';
import { MemberPicker, useForm } from './common';
import { api } from '../../api/client';
import { invalidate } from '../../hooks/useApi';
import { REMINDER_TYPES, REPEAT, EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../lib/constants';
import { toInputDate, toInputDateTime, todayKey } from '../../lib/format';

const nextMorning = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
};

export function ReminderForm({ open, onClose, reminder, defaultMember }) {
  const editing = Boolean(reminder?._id);
  const init = () => (reminder
    ? { ...reminder, member: reminder.member?._id || reminder.member, dueAt: toInputDateTime(reminder.dueAt) }
    : { member: defaultMember || '', type: 'APPOINTMENT', title: '', dueAt: toInputDateTime(nextMorning()), doctor: '', location: '', notes: '', repeat: 'NONE' });
  const { values: v, set, setValues, errors, saving, submit } = useForm(init());
  useEffect(() => { if (open) setValues(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => submit(async (s) => {
    const body = { member: s.member, type: s.type, title: s.title.trim() || REMINDER_TYPES[s.type], dueAt: new Date(s.dueAt), doctor: s.doctor, location: s.location, notes: s.notes, repeat: s.repeat };
    if (editing) await api.patch(`/reminders/${reminder._id}`, body);
    else await api.post('/reminders', body);
    await invalidate('/reminders', '/today');
    onClose();
  }, { success: editing ? 'Updated' : 'Added to the calendar', validate: (s) => ({ ...(!s.member && { member: 'Choose a family member' }), ...(!s.dueAt && { dueAt: 'Pick a date' }) }) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit appointment' : 'New appointment or checkup'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
      <div className="space-y-5">
        <MemberPicker value={v.member} onChange={set('member')} error={errors.member} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" value={v.type} onChange={set('type')} options={REMINDER_TYPES} />
          <Input label="Title" placeholder={REMINDER_TYPES[v.type]} value={v.title} onChange={set('title')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date & time" type="datetime-local" value={v.dueAt} onChange={set('dueAt')} error={errors.dueAt} />
          <Select label="Repeat" value={v.repeat} onChange={set('repeat')} options={REPEAT} hint={v.repeat !== 'NONE' ? 'Marking it done schedules the next one' : undefined} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Doctor" optional value={v.doctor} onChange={set('doctor')} />
          <Input label="Where" optional value={v.location} onChange={set('location')} />
        </div>
        <Textarea label="Notes" optional rows={2} placeholder="Carry BP log, fasting required…" value={v.notes} onChange={set('notes')} />
      </div>
    </Modal>
  );
}

export function ExpenseForm({ open, onClose, expense, defaultMember }) {
  const editing = Boolean(expense?._id);
  const init = () => (expense
    ? { ...expense, member: expense.member?._id || expense.member || '', date: toInputDate(expense.date), amount: String(expense.amount) }
    : { member: defaultMember || '', category: 'MEDICINES', amount: '', date: todayKey(), vendor: '', note: '', paymentMode: 'UPI', taxDeductible: false, reimbursed: false });
  const { values: v, set, setValues, errors, saving, submit } = useForm(init());
  useEffect(() => { if (open) setValues(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => submit(async (s) => {
    const body = { ...s, member: s.member || null, amount: Number(s.amount) };
    delete body._id; delete body.owner; delete body.createdAt; delete body.updatedAt;
    if (editing) await api.patch(`/expenses/${expense._id}`, body);
    else await api.post('/expenses', body);
    await invalidate('/expenses');
    onClose();
  }, { success: editing ? 'Updated' : 'Expense added', validate: (s) => (!(Number(s.amount) > 0) ? { amount: 'Enter an amount' } : {}) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit expense' : 'Add an expense'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Amount" type="number" inputMode="decimal" min="0" prefix="₹" value={v.amount} onChange={set('amount')} error={errors.amount} autoFocus />
          <Input label="Date" type="date" value={v.date} onChange={set('date')} />
        </div>
        <MemberPicker value={v.member} onChange={set('member')} allowNone label="For" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={v.category} onChange={set('category')} options={EXPENSE_CATEGORIES} />
          <Select label="Paid via" value={v.paymentMode} onChange={set('paymentMode')} options={PAYMENT_MODES} />
        </div>
        <Input label="Paid to" optional placeholder="Apollo Pharmacy" value={v.vendor} onChange={set('vendor')} />
        <Input label="Note" optional value={v.note} onChange={set('note')} />
        <div className="space-y-4 rounded-2xl bg-paper p-4">
          <Switch checked={v.taxDeductible} onChange={set('taxDeductible')} label="Tax deductible (Section 80D)" description="Health insurance premiums and preventive checkups. Confirm eligibility with your CA." />
          <Switch checked={v.reimbursed} onChange={set('reimbursed')} label="Reimbursed / claimed" description="Covered by insurance or your employer." />
        </div>
      </div>
    </Modal>
  );
}

export function VaccineForm({ open, onClose, vaccine, defaultMember }) {
  const editing = Boolean(vaccine?._id);
  const init = () => (vaccine
    ? { ...vaccine, member: vaccine.member?._id || vaccine.member, dueDate: toInputDate(vaccine.dueDate), givenDate: toInputDate(vaccine.givenDate) }
    : { member: defaultMember || '', name: '', dose: '', dueDate: todayKey(), givenDate: '', provider: '', batch: '', notes: '' });
  const { values: v, set, setValues, errors, saving, submit } = useForm(init());
  useEffect(() => { if (open) setValues(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => submit(async (s) => {
    const body = { member: s.member, name: s.name, dose: s.dose, dueDate: s.dueDate || null, givenDate: s.givenDate || null, provider: s.provider, batch: s.batch, notes: s.notes };
    if (editing) await api.patch(`/vaccines/${vaccine._id}`, body);
    else await api.post('/vaccines', body);
    await invalidate('/vaccines', '/today', '/readiness');
    onClose();
  }, { success: 'Saved', validate: (s) => ({ ...(!s.member && { member: 'Choose a family member' }), ...(!s.name.trim() && { name: 'Enter the vaccine' }) }) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? `${vaccine.name} — ${vaccine.dose || 'dose'}` : 'Add a vaccine'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
      <div className="space-y-5">
        {!editing && <MemberPicker value={v.member} onChange={set('member')} error={errors.member} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Vaccine" placeholder="Influenza, Typhoid…" value={v.name} onChange={set('name')} error={errors.name} />
          <Input label="Dose" optional placeholder="Dose 1, Booster" value={v.dose} onChange={set('dose')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Due on" type="date" value={v.dueDate} onChange={set('dueDate')} />
          <Input label="Given on" optional type="date" value={v.givenDate} onChange={set('givenDate')} hint="Fill this once the shot is done" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Clinic / hospital" optional value={v.provider} onChange={set('provider')} />
          <Input label="Batch no." optional value={v.batch} onChange={set('batch')} />
        </div>
      </div>
    </Modal>
  );
}
