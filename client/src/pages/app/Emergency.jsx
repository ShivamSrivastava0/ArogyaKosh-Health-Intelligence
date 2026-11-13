import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  LuPhone, LuHospital, LuDroplet, LuPill, LuPrinter, LuCopy, LuRefreshCw, LuExternalLink, LuCheck, LuChevronRight, LuShieldCheck, LuSiren,
} from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { Card, CardHeader, PageHeader, Avatar, Badge, ScoreRing, Skeleton } from '../../components/ui/Display';
import { ActionMenu, useConfirm } from '../../components/ui/Overlay';
import { Switch } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import { EmergencyArt } from '../../components/illustrations';
import { firstName, daysFromNow, toInputDate } from '../../lib/format';

const NEARBY = [
  { label: 'Hospitals', q: 'hospital emergency near me', icon: LuHospital },
  { label: 'Blood banks', q: 'blood bank near me', icon: LuDroplet },
  { label: '24×7 pharmacy', q: '24 hour pharmacy near me', icon: LuPill },
];

const cardUrl = (m) => `${window.location.origin}/e/${m.emergencyToken}`;

function WalletCard({ member }) {
  return (
    <div className="w-[340px] rounded-3xl border-2 border-ink bg-surface p-5 text-ink">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.18em] text-bad">Medical ID · Scan in emergency</p>
          <p className="mt-1 font-display text-xl font-bold leading-tight">{member.name}</p>
          <p className="text-xs text-ink-3">{member.age !== null ? `${member.age} yrs` : ''}{member.bloodGroup ? ` · Blood ${member.bloodGroup}` : ''}</p>
        </div>
        <div className="rounded-xl bg-white p-1.5"><QRCode value={cardUrl(member)} size={84} /></div>
      </div>
      <div className="mt-3 space-y-1 text-[11px] leading-snug">
        <p><b>Allergies:</b> {member.allergies.map((a) => a.name).join(', ') || (member.noKnownAllergies ? 'None known' : '—')}</p>
        <p><b>Conditions:</b> {member.conditions.filter((c) => c.status !== 'RESOLVED').map((c) => c.name).join(', ') || '—'}</p>
        {member.emergencyContacts[0] && <p><b>Call:</b> {member.emergencyContacts[0].name} {member.emergencyContacts[0].phone}</p>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2"><Logo size="sm" mark={false} /><span className="text-[10px] text-ink-3">Ambulance 108 · Emergency 112</span></div>
    </div>
  );
}

function MemberCard({ member, onPrint }) {
  const confirm = useConfirm();
  const url = cardUrl(member);
  const missing = [!member.bloodGroup && 'blood group', !(member.allergies.length || member.noKnownAllergies) && 'allergies', !member.emergencyContacts.length && 'emergency contact'].filter(Boolean);

  const toggle = async (on) => {
    try { await api.patch(`/members/${member._id}`, { emergencyEnabled: on }); await invalidate('/members'); } catch (e) { toast.error(errorMessage(e)); }
  };
  const rotate = async () => {
    if (!(await confirm({ title: 'Reset this QR code?', body: 'Printed cards and saved links will stop working. You will need to print the new card.', confirmLabel: 'Reset' }))) return;
    try { await api.post(`/members/${member._id}/emergency-token`); await invalidate('/members'); toast.success('New QR code created'); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} color={member.color} />
          <div>
            <p className="font-semibold">{member.name}</p>
            <p className="text-xs text-ink-3">{member.bloodGroup ? `Blood ${member.bloodGroup}` : 'Blood group missing'}</p>
          </div>
        </div>
        <ActionMenu items={[
          { label: 'Open public card', icon: LuExternalLink, onClick: () => window.open(url, '_blank') },
          { label: 'Copy link', icon: LuCopy, onClick: () => { navigator.clipboard.writeText(url); toast.success('Link copied'); } },
          { label: 'Reset QR code', icon: LuRefreshCw, onClick: rotate },
        ]} />
      </div>
      <div className={clsx('mx-auto my-5 rounded-2xl border border-line bg-white p-3', !member.emergencyEnabled && 'opacity-25')}>
        <QRCode value={url} size={148} />
      </div>
      {missing.length > 0 && (
        <Link to={`/app/family/${member._id}?edit=${!member.bloodGroup ? 'basics' : !member.emergencyContacts.length ? 'contacts' : 'medical'}`} className="mb-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
          Missing: {missing.join(', ')}<LuChevronRight className="ml-auto h-3.5 w-3.5" />
        </Link>
      )}
      <div className="mt-auto space-y-3">
        <Switch checked={member.emergencyEnabled} onChange={toggle} label="Card active" description="Turn off to make the QR show nothing." />
        <Button variant="secondary" size="sm" icon={LuPrinter} className="w-full" onClick={() => onPrint(member)} disabled={!member.emergencyEnabled}>Print wallet card</Button>
      </div>
    </Card>
  );
}

function KitChecker() {
  const { data, loading } = useApi('/kit');
  const [items, setItems] = useState([]);
  useEffect(() => { if (data) setItems(data.items); }, [data]);
  const save = async (next) => {
    setItems(next);
    try { await api.put('/kit', { items: next.map(({ key, have, expiry }) => ({ key, have, expiry: expiry || null })) }); invalidate('/readiness', '/today'); } catch (e) { toast.error(errorMessage(e)); }
  };
  const update = (key, patch) => save(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const essentials = items.filter((i) => i.essential);
  const haveEss = essentials.filter((i) => i.have).length;
  const pct = essentials.length ? Math.round((haveEss / essentials.length) * 100) : 0;
  const missing = essentials.filter((i) => !i.have);

  if (loading) return <Skeleton className="h-96" />;
  return (
    <Card id="kit">
      <CardHeader title="First-aid kit checker" subtitle="Tick what you have at home. Essentials count towards readiness." />
      <div className="p-5">
        <div className="mb-5 flex items-center gap-4 rounded-2xl bg-paper p-4">
          <ScoreRing value={pct} size={64} stroke={6} />
          <div className="flex-1">
            <p className="text-sm font-semibold">{haveEss} of {essentials.length} essentials</p>
            {missing.length ? <p className="mt-0.5 text-[13px] text-ink-3">Buy next: {missing.slice(0, 4).map((i) => i.name.split(' (')[0]).join(', ')}{missing.length > 4 ? '…' : ''}</p> : <p className="mt-0.5 text-[13px] text-ok">Your kit has every essential.</p>}
          </div>
        </div>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {items.map((i) => {
            const exp = i.expiry ? daysFromNow(i.expiry) : null;
            return (
              <li key={i.key} className="flex items-start gap-3 border-b border-line-soft py-3">
                <button type="button" onClick={() => update(i.key, { have: !i.have })} aria-pressed={i.have} aria-label={i.name}
                  className={clsx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2', i.have ? 'border-ink bg-ink text-lime' : 'border-line')}>
                  {i.have && <LuCheck className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.name} {i.essential && <Badge className="ml-1">essential</Badge>}</p>
                  <p className="text-xs text-ink-3">{i.why}</p>
                  {i.have && i.expires && (
                    <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">Expires
                      <input type="date" value={toInputDate(i.expiry)} onChange={(e) => update(i.key, { expiry: e.target.value })} className="rounded-md border border-line px-1.5 py-0.5 text-xs" />
                      {exp !== null && exp < 0 && <Badge tone="bad">Expired</Badge>}
                      {exp !== null && exp >= 0 && exp <= 30 && <Badge tone="warn">Soon</Badge>}
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

export default function Emergency() {
  const { members } = useFamily();
  const [params] = useSearchParams();
  const focus = params.get('member');
  const { data: ready } = useApi('/readiness');
  const { data: kit } = useApi('/kit');
  const [printing, setPrinting] = useState(null);
  const ordered = useMemo(() => (focus ? [...members].sort((a, b) => Number(b._id === focus) - Number(a._id === focus)) : members), [members, focus]);

  useEffect(() => {
    if (!printing) return undefined;
    const t = setTimeout(() => { window.print(); setPrinting(null); }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  useEffect(() => {
    if (window.location.hash === '#kit') setTimeout(() => document.getElementById('kit')?.scrollIntoView({ behavior: 'smooth' }), 400);
  }, []);

  return (
    <div>
      {printing && <div className="hidden print:block"><WalletCard member={printing} /><p className="mt-3 text-xs">Cut along the border and keep it in the wallet. Scan the QR to see current details.</p></div>}
      <div className="no-print">
        <div className="relative"><EmergencyArt className="pointer-events-none absolute -top-6 right-0 hidden h-36 md:block" /><PageHeader title="Emergency" subtitle="When minutes matter: numbers, nearby help, and medical ID cards anyone can scan." /></div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href="tel:112" className="flex items-center gap-4 rounded-3xl bg-bad p-5 text-white transition-transform hover:-translate-y-0.5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15"><LuSiren className="h-6 w-6" /></span>
            <span><span className="block font-display text-3xl font-bold leading-none">112</span><span className="text-sm text-white/80">National emergency</span></span>
          </a>
          <a href="tel:108" className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-white transition-transform hover:-translate-y-0.5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><LuPhone className="h-6 w-6 text-lime" /></span>
            <span><span className="block font-display text-3xl font-bold leading-none">108</span><span className="text-sm text-white/70">Ambulance</span></span>
          </a>
          {NEARBY.slice(0, 2).map((n) => (
            <a key={n.label} href={`https://www.google.com/maps/search/${encodeURIComponent(n.q)}`} target="_blank" rel="noreferrer" className="card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-ink-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-paper"><n.icon className="h-5 w-5" /></span>
              <span><span className="block font-semibold">Nearby {n.label.toLowerCase()}</span><span className="text-[13px] text-ink-3">Opens Google Maps</span></span>
            </a>
          ))}
        </div>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Medical ID cards</h2>
            <p className="mt-1 text-sm text-ink-3">Scanning shows blood group, allergies, conditions, medicines and who to call — nothing else. No app or login needed.</p>
          </div>
        </div>
        <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((m) => <MemberCard key={m._id} member={m} onPrint={setPrinting} />)}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Card>
            <CardHeader title="Readiness checklist" subtitle={ready ? `${ready.done}/${ready.total} complete` : ''} action={ready && <ScoreRing value={ready.score} size={48} stroke={5} />} />
            <div className="p-3">
              {ready ? (
                <ul>
                  {ready.items.map((i) => (
                    <li key={`${i.key}-${i.member?._id || 'home'}`}>
                      <Link to={i.to} className="flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] hover:bg-paper">
                        <span className={clsx('grid h-5 w-5 shrink-0 place-items-center rounded-full', i.done ? 'bg-ok text-white' : 'border-2 border-line')}>{i.done && <LuCheck className="h-3 w-3" />}</span>
                        <span className={clsx('flex-1', i.done && 'text-ink-3')}>{i.label}</span>
                        <span className="text-xs text-ink-3">{i.member ? firstName(i.member.name) : 'Home'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Skeleton className="h-64" />}
            </div>
            <div className="border-t border-line-soft p-5">
              <p className="mb-3 text-sm font-semibold">Other helplines</p>
              <div className="grid grid-cols-2 gap-2">
                {(kit?.numbers || []).filter((n) => !['112', '108'].includes(n.number)).map((n) => (
                  <a key={n.number} href={`tel:${n.number}`} className="rounded-xl bg-paper px-3 py-2 text-[13px] hover:bg-lime-soft"><span className="tnum block font-semibold">{n.number}</span><span className="text-xs text-ink-3">{n.label}</span></a>
                ))}
              </div>
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(NEARBY[2].q)}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-[13px] font-medium text-ink-2 hover:text-ink"><LuPill className="h-4 w-4" />Find a 24×7 pharmacy<LuExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </Card>
          <KitChecker />
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-lime-soft p-4 text-sm">
          <LuShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p><b>Tip:</b> Save your card's QR as your phone's lock-screen wallpaper. Paramedics are trained to check lock screens for medical ID.</p>
        </div>
      </div>
    </div>
  );
}
