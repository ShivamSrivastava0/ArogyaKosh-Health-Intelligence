import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuDownload, LuMailCheck, LuTriangleAlert } from 'react-icons/lu';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { Card, CardHeader, PageHeader, Badge } from '../../components/ui/Display';
import { Input, Switch } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';

function Section({ title, description, children }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={description} />
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default function Settings() {
  const { user, updateUser, applySession, logout } = useAuth();
  const { config } = useFamily();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '', city: user.city || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const [del, setDel] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const run = async (key, fn, ok) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };

  const saveProfile = () => run('profile', async () => updateUser((await api.patch('/auth/me', profile)).user), 'Profile saved');
  const savePw = () => run('pw', async () => {
    const res = await api.post('/auth/change-password', pw);
    applySession(res);
    setPw({ currentPassword: '', newPassword: '' });
  }, 'Password updated. Other devices were signed out.');
  const toggleDigest = (v) => run('digest', async () => updateUser((await api.patch('/auth/me', { prefs: { emailDigest: v } })).user));
  const resend = () => run('verify', () => api.post('/auth/resend-verification'), 'Verification email sent');
  const exportData = () => run('export', async () => {
    const a = document.createElement('a');
    a.href = await api.blob('/auth/export');
    a.download = `arogyakosh-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'Export downloaded');
  const deleteAccount = () => run('delete', async () => {
    await api.delete('/auth/me', { confirm: 'DELETE' });
    await logout();
    navigate('/');
  }, 'Account deleted');

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Your account, notifications and data." />
      <div className="space-y-6">
        <Section title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="Email" value={user.email} disabled hint={user.isDemo ? 'Demo account' : undefined} />
            <Input label="Phone" optional value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input label="City" optional value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            {user.isEmailVerified ? <Badge tone="ok"><LuMailCheck className="h-3 w-3" />Email verified</Badge> : (
              <span className="flex items-center gap-2 text-[13px] text-ink-3"><Badge tone="warn">Not verified</Badge><button type="button" className="link" onClick={resend} disabled={busy === 'verify'}>Resend link</button></span>
            )}
            <Button loading={busy === 'profile'} onClick={saveProfile}>Save</Button>
          </div>
        </Section>

        <Section title="Password" description={user.googleId ? 'Signed up with Google? Leave "current password" empty to set one.' : 'Changing it signs you out on other devices.'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Input label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} hint="8+ characters with a letter and a number" />
          </div>
          <div className="mt-5 flex justify-end"><Button loading={busy === 'pw'} disabled={user.isDemo || pw.newPassword.length < 8} onClick={savePw}>Update password</Button></div>
        </Section>

        <Section title="Notifications">
          <Switch checked={user.prefs?.emailDigest} onChange={toggleDigest} disabled={busy === 'digest'}
            label="Morning email digest" description={config.mail ? "Every day at 7:30 am: today's doses, refills and appointments." : 'Email is not configured on this server yet — the digest will start once it is.'} />
        </Section>

        <Section title="Your data" description="Your records belong to you. Take a full copy any time.">
          <Button variant="secondary" icon={LuDownload} loading={busy === 'export'} onClick={exportData}>Download everything (JSON)</Button>
        </Section>

        <Card className="border-bad/30">
          <CardHeader title="Delete account" subtitle="Permanently removes every family member, record, file and reading. This cannot be undone." />
          <div className="p-5"><Button variant="danger" onClick={() => setDel(true)}>Delete my account</Button></div>
        </Card>
      </div>

      <Modal open={del} onClose={() => setDel(false)} title="Delete your account?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" loading={busy === 'delete'} disabled={confirmText !== 'DELETE'} onClick={deleteAccount}>Delete forever</Button></>}>
        <div className="space-y-4">
          <p className="flex gap-2 text-sm text-ink-2"><LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bad" />All data and uploaded files will be erased immediately. Consider downloading a copy first.</p>
          <Input label='Type "DELETE" to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
