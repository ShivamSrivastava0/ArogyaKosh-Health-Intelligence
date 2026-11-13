import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuHandHeart, LuEye, LuCircleX } from 'react-icons/lu';
import { api, errorMessage, activeHousehold } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { clearCache } from '../../hooks/useApi';
import Logo from '../../components/ui/Logo';
import Button, { Spinner } from '../../components/ui/Button';
import { FamilyArt } from '../../components/illustrations';
import { relDays } from '../../lib/format';

export default function AcceptInvite() {
  const { token } = useParams();
  const { isAuthed, user, status } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const here = `/invite/${token}`;

  useEffect(() => {
    api.get(`/public/invites/${token}`).then(setInvite).catch((e) => setError(errorMessage(e, 'Invite not found')));
  }, [token]);

  const accept = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/invites/${token}/accept`);
      activeHousehold.set(r.householdId);
      clearCache();
      navigate('/app', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const wrongAccount = isAuthed && invite && user.email !== invite.email;

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-50 to-paper px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block w-fit"><Logo /></Link>
        <div className="card overflow-hidden">
          <div className="bg-ink px-6 pt-6 text-white"><FamilyArt className="mx-auto h-40" /></div>
          <div className="p-6">
            {!invite && !error && <div className="grid h-32 place-items-center"><Spinner className="h-6 w-6" /></div>}
            {error && !invite && (
              <div className="text-center">
                <LuCircleX className="mx-auto h-8 w-8 text-bad" />
                <p className="mt-3 font-display text-xl font-semibold">This invite can't be used</p>
                <p className="mt-1 text-sm text-ink-3">{error}</p>
              </div>
            )}
            {invite && (
              <>
                <p className="eyebrow flex items-center gap-2 text-brand"><LuHandHeart className="h-4 w-4" />Care Circle invite</p>
                <h1 className="mt-2 text-2xl font-semibold">{invite.ownerName} wants your help caring for their family</h1>
                <p className="mt-2 text-sm text-ink-2">
                  You'll join as a <b>{invite.role === 'VIEWER' ? 'viewer' : 'caregiver'}</b>{invite.label ? ` (${invite.label})` : ''} and see {invite.members} family member{invite.members === 1 ? '' : 's'}' medicines, readings and appointments.
                </p>
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-paper p-3 text-xs text-ink-3">
                  {invite.role === 'VIEWER' ? <LuEye className="mt-0.5 h-4 w-4 shrink-0" /> : <LuHandHeart className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{invite.role === 'VIEWER' ? 'Viewers can see everything but can\'t change anything.' : 'Caregivers can mark doses, log readings and add records. You\'ll get an alert if a dose is missed.'} Invite for <b>{invite.email}</b> · expires {relDays(invite.expiresAt).toLowerCase()}.</span>
                </div>
                {error && <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
                <div className="mt-6 space-y-2">
                  {status === 'loading' ? <Spinner /> : !isAuthed ? (
                    <>
                      <Button className="w-full" size="lg" onClick={() => navigate('/login', { state: { from: here } })}>Sign in as {invite.email}</Button>
                      <Button className="w-full" variant="secondary" onClick={() => navigate('/register', { state: { from: here, email: invite.email } })}>Create a free account</Button>
                    </>
                  ) : wrongAccount ? (
                    <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">You're signed in as {user.email}. This invite is for {invite.email} — sign out and sign in with that email to accept.</p>
                  ) : (
                    <Button className="w-full" size="lg" loading={busy} onClick={accept}>Join {invite.ownerName.split(' ')[0]}'s care circle</Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
