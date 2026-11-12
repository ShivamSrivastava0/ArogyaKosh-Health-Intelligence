import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuPhone, LuTriangleAlert, LuPill, LuHeartPulse, LuShieldCheck, LuStethoscope } from 'react-icons/lu';
import { api, errorMessage } from '../../api/client';
import Logo from '../../components/ui/Logo';
import { Spinner } from '../../components/ui/Button';
import { GENDERS, SEVERITIES } from '../../lib/constants';
import { fmtDate } from '../../lib/format';

/** What a paramedic or bystander sees after scanning the QR. Large type, call buttons first. */
export default function PublicEmergency() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    document.title = 'Emergency medical info';
    api.get(`/public/emergency/${token}`)
      .then((d) => setState({ card: d.card }))
      .catch((e) => setState({ error: errorMessage(e, 'Card not found') }));
  }, [token]);

  if (state.loading) return <div className="grid min-h-dvh place-items-center"><Spinner className="h-6 w-6" /></div>;
  if (state.error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div><Logo /><p className="mt-6 font-display text-2xl font-semibold">This card isn't active</p><p className="mt-2 text-ink-3">{state.error}</p>
          <a href="tel:112" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-bad px-6 font-semibold text-white"><LuPhone className="h-5 w-5" />Call 112</a></div>
      </div>
    );
  }
  const c = state.card;
  const severe = c.allergies.filter((a) => a.severity === 'SEVERE');

  return (
    <div className="min-h-dvh bg-paper pb-10">
      <div className="bg-bad px-5 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Emergency medical information</p>
          <h1 className="mt-2 text-4xl font-bold">{c.name}</h1>
          <p className="mt-1 text-lg text-white/85">{[c.age !== null && `${c.age} years`, GENDERS[c.gender]].filter(Boolean).join(' · ')}</p>
          <div className="mt-5 flex gap-3">
            <div className="rounded-2xl bg-white px-5 py-3 text-center text-ink"><p className="text-2xs font-bold uppercase tracking-wider text-ink-3">Blood</p><p className="font-display text-3xl font-bold">{c.bloodGroup || '?'}</p></div>
            {c.organDonor && <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold">Organ donor</div>}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-4 max-w-lg space-y-4 px-4">
        {c.emergencyContacts.map((ct) => (
          <a key={ct.phone} href={`tel:${ct.phone}`} className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-white shadow-pop">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-ink"><LuPhone className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block text-lg font-semibold">Call {ct.name}</span><span className="text-sm text-white/70">{ct.relation} · {ct.phone}</span></span>
          </a>
        ))}

        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-bad"><LuTriangleAlert className="h-4 w-4" />Allergies</h2>
          {c.allergies.length ? (
            <ul className="mt-3 space-y-2">{c.allergies.map((a) => <li key={a.name} className="text-lg"><b>{a.name}</b> <span className="text-base text-ink-3">— {SEVERITIES[a.severity]}{a.reaction ? `, ${a.reaction}` : ''}</span></li>)}</ul>
          ) : <p className="mt-2 text-lg">{c.noKnownAllergies ? 'No known allergies' : 'Not recorded'}</p>}
          {severe.length > 0 && <p className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">Severe: {severe.map((a) => a.name).join(', ')}</p>}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-ink-3"><LuHeartPulse className="h-4 w-4" />Conditions</h2>
          <p className="mt-2 text-lg">{c.conditions.join(', ') || 'None recorded'}</p>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-ink-3"><LuPill className="h-4 w-4" />Current medicines</h2>
          {c.medicines.length ? <ul className="mt-2 space-y-1 text-lg">{c.medicines.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="mt-2 text-lg">None</p>}
        </section>

        {(c.doctor || c.insurance.length > 0 || c.notes) && (
          <section className="card space-y-3 p-5 text-[15px]">
            {c.doctor && <p className="flex items-center gap-2"><LuStethoscope className="h-4 w-4 text-ink-3" /><b>{c.doctor.name}</b>{c.doctor.phone && <a href={`tel:${c.doctor.phone}`} className="link ml-auto">{c.doctor.phone}</a>}</p>}
            {c.insurance.map((i) => <p key={i.provider} className="flex items-center gap-2"><LuShieldCheck className="h-4 w-4 text-ink-3" />{i.provider}{i.policyNumber && <span className="text-ink-3"> · {i.policyNumber}</span>}{i.helpline && <a href={`tel:${i.helpline}`} className="link ml-auto">{i.helpline}</a>}</p>)}
            {c.notes && <p className="rounded-xl bg-paper p-3 text-ink-2">{c.notes}</p>}
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <a href="tel:108" className="rounded-2xl bg-surface p-4 text-center font-semibold shadow-card">🚑 Ambulance 108</a>
          <a href="tel:112" className="rounded-2xl bg-surface p-4 text-center font-semibold shadow-card">Emergency 112</a>
        </div>
        <p className="pt-2 text-center text-xs text-ink-3">Updated {fmtDate(c.updatedAt)} · Shared by the family via <Link to="/" className="link">ArogyaKosh</Link></p>
      </div>
    </div>
  );
}
