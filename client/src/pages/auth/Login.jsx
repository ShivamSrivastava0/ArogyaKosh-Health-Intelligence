import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuArrowRight, LuSparkles } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';

export function DemoButton({ className }) {
  const { demo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="secondary" className={className} icon={LuSparkles} loading={busy}
      onClick={async () => {
        setBusy(true);
        try { await demo(); navigate('/app'); } catch (e) { toast.error(errorMessage(e)); setBusy(false); }
      }}>
      Explore a sample family
    </Button>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your family's health vault."
      footer={<>New here? <Link to="/register" className="link font-semibold text-ink">Create a free account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Link to="/forgot-password" className="mt-2 inline-block text-[13px] font-medium text-ink-3 hover:text-ink">Forgot password?</Link>
        </div>
        {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={LuArrowRight}>Sign in</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-4"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <div className="space-y-3">
        <GoogleButton />
        <DemoButton className="w-full" />
      </div>
    </AuthLayout>
  );
}
