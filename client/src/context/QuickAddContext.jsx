import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import MedicineForm from '../components/forms/MedicineForm';
import VitalForm from '../components/forms/VitalForm';
import RecordForm from '../components/forms/RecordForm';
import MemberForm from '../components/forms/MemberForm';
import { ReminderForm, ExpenseForm, VaccineForm } from '../components/forms/SimpleForms';

const Ctx = createContext(null);

/**
 * One place that owns every "add/edit" modal, so any screen can call
 * quickAdd.open('medicine', { member }) without wiring its own state.
 */
export function QuickAddProvider({ children }) {
  const [state, setState] = useState({ kind: null, props: {} });
  const open = useCallback((kind, props = {}) => setState({ kind, props }), []);
  const close = useCallback(() => setState((s) => ({ ...s, kind: null })), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  const p = state.props;

  return (
    <Ctx.Provider value={value}>
      {children}
      <MedicineForm open={state.kind === 'medicine'} onClose={close} medicine={p.medicine} defaultMember={p.member} />
      <VitalForm open={state.kind === 'vital'} onClose={close} defaultMember={p.member} defaultType={p.type} />
      <RecordForm open={state.kind === 'record'} onClose={close} record={p.record} defaultMember={p.member} defaultCategory={p.category} onSaved={p.onSaved} />
      <ReminderForm open={state.kind === 'reminder'} onClose={close} reminder={p.reminder} defaultMember={p.member} />
      <ExpenseForm open={state.kind === 'expense'} onClose={close} expense={p.expense} defaultMember={p.member} />
      <VaccineForm open={state.kind === 'vaccine'} onClose={close} vaccine={p.vaccine} defaultMember={p.member} />
      <MemberForm open={state.kind === 'member'} onClose={close} member={p.memberDoc} section={p.section} onSaved={p.onSaved} />
    </Ctx.Provider>
  );
}

export const useQuickAdd = () => useContext(Ctx);
