import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LuArrowRight, LuCheck } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import { DemoButton } from './Login';

const RULES = [
  ['8+ characters', (p) => p.length >= 8],
  ['A letter', (p) => /[A-Za-z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pwOk = RULES.every(([, t]) => t(form.password));

  const submit = async (e) => {
    e.preventDefault();
    if (!pwOk) { setErrors({ password: 'Password does not meet the rules' }); return; }
    setBusy(true);
    setError('');
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/app', { replace: true });
    } catch (err) {
      const fe = err?.response?.data?.errors;
      if (Array.isArray(fe)) setErrors(Object.fromEntries(fe.map((x) => [x.field, x.message])));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };

  return (
    <AuthLayout title="Create your family vault" subtitle="Free. Takes a minute. Add your parents and kids after."
      footer={<>Already have an account? <Link to="/login" className="link font-semibold text-ink">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Your name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required autoFocus />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <div>
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} required />
          <div className="mt-2 flex gap-3">
            {RULES.map(([label, test]) => {
              const ok = test(form.password);
              return <span key={label} className={clsx('flex items-center gap-1 text-xs', ok ? 'text-ok' : 'text-ink-4')}><LuCheck className="h-3 w-3" />{label}</span>;
            })}
          </div>
        </div>
        {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={LuArrowRight}>Create account</Button>
        <p className="text-xs leading-relaxed text-ink-3">ArogyaKosh helps you organise health information. It doesn't replace a doctor's advice.</p>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-4"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <div className="space-y-3"><GoogleButton /><DemoButton className="w-full" /></div>
    </AuthLayout>
  );
}
