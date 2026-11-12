import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuMailCheck } from 'react-icons/lu';
import { api, errorMessage } from '../../api/client';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await api.post('/auth/forgot-password', { email: email.trim() }); setSent(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title={sent ? 'Check your inbox' : 'Reset your password'} subtitle={sent ? undefined : "Enter your email and we'll send a reset link."}
      footer={<Link to="/login" className="link font-semibold text-ink">Back to sign in</Link>}>
      {sent ? (
        <div className="flex gap-3 rounded-2xl bg-ok-soft p-4 text-sm text-ink-2">
          <LuMailCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
          <p>If <b>{email}</b> has an account, a reset link is on its way. It's valid for one hour — check spam if you don't see it.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
