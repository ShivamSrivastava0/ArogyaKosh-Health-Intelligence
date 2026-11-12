import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button, { Spinner } from '../../components/ui/Button';
import AuthLayout from './AuthLayout';

export default function VerifyEmail() {
  const { token } = useParams();
  const { isAuthed, reloadUser } = useAuth();
  const [state, setState] = useState('loading');
  const [msg, setMsg] = useState('');
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api.get(`/auth/verify-email/${token}`)
      .then(() => { setState('ok'); if (isAuthed) reloadUser(); })
      .catch((e) => { setState('error'); setMsg(errorMessage(e)); });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthLayout title={state === 'ok' ? 'Email verified' : state === 'error' ? 'Link not valid' : 'Verifying…'}>
      {state === 'loading' && <Spinner className="h-6 w-6" />}
      {state === 'ok' && (
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-ink-2"><LuCircleCheck className="h-5 w-5 text-ok" />You'll now get reminders and the morning digest by email.</p>
          <Button to={isAuthed ? '/app' : '/login'} size="lg">{isAuthed ? 'Go to Today' : 'Sign in'}</Button>
        </div>
      )}
      {state === 'error' && (
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-ink-2"><LuCircleX className="h-5 w-5 text-bad" />{msg}</p>
          <Button to={isAuthed ? '/app/settings' : '/login'} variant="secondary">{isAuthed ? 'Resend from Settings' : 'Sign in to resend'}</Button>
        </div>
      )}
    </AuthLayout>
  );
}
