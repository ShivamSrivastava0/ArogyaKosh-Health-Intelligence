import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuClock, LuPrinter, LuLock } from 'react-icons/lu';
import { api, errorMessage, API_URL } from '../../api/client';
import Logo from '../../components/ui/Logo';
import Button, { Spinner } from '../../components/ui/Button';
import BriefDocument from '../../components/BriefDocument';
import { fmtDateTime } from '../../lib/format';

export default function PublicShare() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    document.title = 'Shared health summary';
    api.get(`/public/share/${token}`).then((d) => setState(d)).catch((e) => setState({ error: errorMessage(e, 'Link not found') }));
  }, [token]);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/"><Logo size="sm" /></Link>
          {state.brief && <Button size="sm" variant="secondary" icon={LuPrinter} onClick={() => window.print()}>Print</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {state.loading && <div className="grid h-64 place-items-center"><Spinner className="h-6 w-6" /></div>}
        {state.error && (
          <div className="card mx-auto max-w-md p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-paper"><LuLock className="h-5 w-5" /></span>
            <p className="mt-4 font-display text-xl font-semibold">This summary isn't available</p>
            <p className="mt-2 text-sm text-ink-3">{state.error}. Ask the patient to send a new link.</p>
          </div>
        )}
        {state.brief && (
          <>
            <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-lime-soft px-4 py-3 text-[13px]">
              <LuClock className="h-4 w-4" />
              <span>{state.label ? <b>{state.label} · </b> : null}Shared securely by the patient. This link expires {fmtDateTime(state.expiresAt)}.</span>
            </div>
            <BriefDocument brief={state.brief} fileUrl={(r) => `${API_URL}/public/share/${token}/records/${r._id}/file`} />
            <p className="mt-6 text-center text-xs text-ink-3">Information is patient-reported and may be incomplete. Verify clinically before acting on it.</p>
          </>
        )}
      </main>
    </div>
  );
}
