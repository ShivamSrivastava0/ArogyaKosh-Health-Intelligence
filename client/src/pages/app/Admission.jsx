import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuCheck, LuX, LuDownload, LuShare2, LuEye, LuFileText, LuImage, LuShieldCheck, LuInfo, LuHospital } from 'react-icons/lu';
import { useApi } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { useHousehold } from '../../context/HouseholdContext';
import { Card, CardHeader, Avatar, Badge, Skeleton, Tabs, ProgressBar } from '../../components/ui/Display';
import Button from '../../components/ui/Button';
import { EmergencyArt } from '../../components/illustrations';
import { RECORD_CATEGORIES } from '../../lib/constants';
import { fmtDate, inr, bytes, firstName } from '../../lib/format';

function Checklist({ kit, member, onChanged }) {
  const quick = useQuickAdd();
  const { canWrite } = useHousehold();
  const fix = (c) => {
    const [kind, arg] = c.fix.split(':');
    if (kind === 'profile') quick.open('member', { memberDoc: member, section: arg, onSaved: onChanged });
    else quick.open('record', { member: member._id, category: arg, onSaved: onChanged });
  };
  const required = kit.checklist.filter((c) => !c.optional);
  const done = required.filter((c) => c.ok).length;
  return (
    <Card>
      <CardHeader title="What the insurance desk will ask for" subtitle={kit.ready ? 'Everything required is on file' : `${done} of ${required.length} required items on file`} icon={LuShieldCheck} />
      <div className="px-5 pt-4"><ProgressBar value={(done / required.length) * 100} tone={kit.ready ? 'ok' : 'warn'} /></div>
      <ul className="divide-y divide-line p-2">
        {kit.checklist.map((c) => (
          <li key={c.key} className="flex items-start gap-3 px-3 py-3">
            <span className={clsx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', c.ok ? 'bg-ok-soft text-ok' : c.optional ? 'bg-paper text-ink-4' : 'bg-warn-soft text-warn')}>
              {c.ok ? <LuCheck className="h-3.5 w-3.5" /> : <LuX className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{c.label}{c.optional && <span className="ml-1.5 text-xs font-normal text-ink-4">if applicable</span>}</p>
              {!c.ok && c.hint && <p className="mt-0.5 text-xs text-ink-3">{c.hint}</p>}
            </div>
            {!c.ok && canWrite && <Button size="xs" variant="secondary" onClick={() => fix(c)}>{c.fix.startsWith('upload') ? 'Upload' : 'Add'}</Button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Documents({ docs, selected, toggle }) {
  return (
    <Card>
      <CardHeader title="Documents to include" subtitle="Suggested: insurance card, ID proof, latest discharge summary and prescription, reports from the last 6 months" icon={LuFileText} />
      {!docs.length ? <p className="p-5 text-sm text-ink-3">No files in the locker for this person yet. The kit will contain the cover sheet and medical summary.</p> : (
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto p-2">
          {docs.map((d) => {
            const on = selected.has(d._id);
            const Icon = /image/.test(d.mime) ? LuImage : LuFileText;
            return (
              <li key={d._id}>
                <label className={clsx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-paper', !d.embeddable && 'cursor-not-allowed opacity-50')}>
                  <input type="checkbox" className="h-4 w-4 accent-[#0B2239]" checked={on} disabled={!d.embeddable} onChange={() => toggle(d._id)} />
                  <Icon className="h-4 w-4 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-ink-3">{RECORD_CATEGORIES[d.category] || d.category} · {fmtDate(d.date)} · {bytes(d.size)}{!d.embeddable && ' · can’t be merged (not PDF/JPG/PNG)'}</p>
                  </div>
                  {d.suggested && <Badge tone="lime">Suggested</Badge>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Kit({ member }) {
  const { data, loading, reload } = useApi(`/members/${member._id}/admission-kit`);
  const kit = data?.kit;
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState('');
  useEffect(() => { if (kit) setSelected(new Set(kit.documents.filter((d) => d.suggested).map((d) => d._id))); }, [kit]);
  const ordered = useMemo(() => (kit ? kit.documents.filter((d) => selected.has(d._id)).map((d) => d._id) : []), [kit, selected]);
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const build = async () => api.blob(`/members/${member._id}/admission-kit/pdf?records=${ordered.join(',')}`);
  const filename = `admission-kit-${firstName(member.name).toLowerCase()}.pdf`;
  const run = async (what) => {
    setBusy(what);
    try {
      const url = await build();
      if (what === 'view') window.open(url, '_blank', 'noopener');
      else if (what === 'share') {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Admission kit — ${member.name}` });
        else { toast('Sharing files isn’t supported on this browser — downloading instead.'); download(url); }
      } else download(url);
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error(errorMessage(e));
    } finally { setBusy(''); }
  };
  const download = (url) => { const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); };

  if (loading || !kit) return <Skeleton className="h-96" />;
  const p = kit.policy;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-ink p-5 text-white">
            <div className="flex items-center gap-3">
              <Avatar name={member.name} color={member.color} />
              <div>
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-white/60">{member.age !== null && member.age !== undefined ? `${member.age} yrs · ` : ''}{member.bloodGroup || 'Blood group not set'}</p>
              </div>
              <Badge tone={kit.ready ? 'ok' : 'warn'} className="ml-auto">{kit.ready ? 'Ready' : 'Incomplete'}</Badge>
            </div>
            {p ? (
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">Insurer</dt><dd className="font-medium">{p.provider}</dd></div>
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">Policy no.</dt><dd className="font-mono">{p.policyNumber || '—'}</dd></div>
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">Card ID</dt><dd className="font-mono">{p.cardId || '—'}</dd></div>
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">TPA</dt><dd>{p.tpa || '—'}</dd></div>
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">Sum insured</dt><dd>{p.sumInsured ? inr(p.sumInsured) : '—'}</dd></div>
                <div><dt className="text-2xs uppercase tracking-wider text-white/50">Valid till</dt><dd>{p.validTill ? fmtDate(p.validTill) : '—'}</dd></div>
              </dl>
            ) : <p className="mt-5 text-sm text-white/70">No health insurance saved. The kit still works for self-pay admissions — it carries the ID and medical summary.</p>}
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            <Button icon={LuDownload} loading={busy === 'download'} onClick={() => run('download')} className="flex-1">Download kit</Button>
            <Button variant="secondary" icon={LuShare2} loading={busy === 'share'} onClick={() => run('share')}>Share</Button>
            <Button variant="ghost" icon={LuEye} loading={busy === 'view'} onClick={() => run('view')}>Preview</Button>
          </div>
          <p className="px-4 pb-4 text-xs text-ink-3">One PDF: patient and insurance cover sheet, medical summary, then {ordered.length} document{ordered.length === 1 ? '' : 's'} in this order.</p>
        </Card>
        <Checklist kit={kit} member={member} onChanged={reload} />
      </div>
      <div className="space-y-6">
        <Documents docs={kit.documents} selected={selected} toggle={toggle} />
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><LuInfo className="h-4 w-4 text-info" />At the hospital</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-2">
            <li>Go to the insurance / TPA desk with the kit and the original photo ID.</li>
            <li>The hospital fills the treatment and cost sections of the pre-authorisation form and sends it to the insurer or TPA.</li>
            <li>For a planned admission, send the request early; for an emergency, the hospital must request within its insurer’s window (usually 24 hours).</li>
            <li>Keep the claim reference number the desk gives you.</li>
          </ol>
          <p className="mt-3 text-xs text-ink-3">Only the last 4 characters of an ID are stored here. Carry the original.</p>
        </Card>
      </div>
    </div>
  );
}

export default function Admission() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useApi('/members');
  const members = data?.items || [];
  const member = members.find((m) => m._id === memberId) || members.find((m) => m.relation === 'FATHER' || m.relation === 'MOTHER') || members[0];

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] bg-coral-soft p-6 sm:p-10">
        <EmergencyArt className="pointer-events-none absolute -bottom-6 right-4 hidden h-48 w-auto opacity-90 md:block" />
        <div className="relative max-w-xl">
          <p className="eyebrow flex items-center gap-2 text-[#B4232E]"><LuHospital className="h-4 w-4" />Cashless admission kit</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[38px]">Everything the hospital’s insurance desk asks for, in one tap.</h1>
          <p className="mt-3 text-[15px] text-ink-2">Policy and card details, ID proof, recent reports and a medical summary — merged into one PDF, in the order the desk needs it.</p>
        </div>
      </div>
      {loading ? <Skeleton className="h-96" /> : !member ? null : (
        <>
          <Tabs className="mb-6" value={member._id} onChange={(id) => navigate(`/app/admission/${id}`, { replace: true })}
            tabs={members.map((m) => ({ value: m._id, label: m.isSelf ? 'You' : firstName(m.name) }))} />
          <Kit key={member._id} member={member} />
        </>
      )}
    </div>
  );
}
