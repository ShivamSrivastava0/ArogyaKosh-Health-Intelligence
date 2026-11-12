import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../../api/client';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password: pw.password });
      toast.success('Password reset. Please sign in.');
      navigate('/login');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Choose a new password" footer={<Link to="/login" className="link font-semibold text-ink">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="New password" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} hint="8+ characters with a letter and a number" required autoFocus />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
        {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Reset password</Button>
      </form>
    </AuthLayout>
  );
}
