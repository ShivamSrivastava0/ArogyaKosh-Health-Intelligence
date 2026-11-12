import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useFamily } from '../../context/FamilyContext';
import { Field } from '../ui/Field';
import { Avatar } from '../ui/Display';
import { errorMessage } from '../../api/client';
import { firstName } from '../../lib/format';

/** Avatar pill picker for choosing a family member. */
export function MemberPicker({ value, onChange, label = 'For', allowNone, error }) {
  const { members } = useFamily();
  return (
    <Field label={label} error={error}>
      <div className="flex flex-wrap gap-1.5">
        {allowNone && (
          <button type="button" onClick={() => onChange('')}
            className={clsx('h-9 rounded-full border px-3 text-[13px] font-medium', !value ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-4')}>
            Household
          </button>
        )}
        {members.map((m) => (
          <button key={m._id} type="button" onClick={() => onChange(m._id)}
            className={clsx('flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-[13px] font-medium transition-colors',
              value === m._id ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-4')}>
            <Avatar name={m.name} color={m.color} size="xs" />
            {m.isSelf ? 'Me' : firstName(m.name)}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Form state + submit with toast feedback and field-level server errors. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (eOrValue) => {
    const v = eOrValue?.target ? (eOrValue.target.type === 'checkbox' ? eOrValue.target.checked : eOrValue.target.value) : eOrValue;
    setValues((s) => ({ ...s, [key]: v }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const submit = async (fn, { success, validate } = {}) => {
    const v = validate?.(values) || {};
    if (Object.keys(v).length) { setErrors(v); return null; }
    setSaving(true);
    try {
      const res = await fn(values);
      if (success) toast.success(success);
      return res ?? true;
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length) {
        setErrors(Object.fromEntries(fieldErrors.filter((x) => x.field).map((x) => [x.field.split('.')[0], x.message])));
      }
      toast.error(errorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  };
  return { values, setValues, set, errors, setErrors, saving, submit };
}

export const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
