import { useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuIdCard, LuUpload, LuFileJson, LuCircleCheck, LuTriangleAlert, LuInfo, LuPencil, LuSparkles } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import http, { api, errorMessage } from '../../api/client';
import { useQuickAdd } from '../../context/QuickAddContext';
import { useHousehold } from '../../context/HouseholdContext';
import { Card, CardHeader, Badge, Skeleton, Tabs } from '../../components/ui/Display';
import { Checkbox } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { RECORD_CATEGORIES } from '../../lib/constants';
import { fmtDate, bytes, firstName } from '../../lib/format';

const SECTIONS = [
  { key: 'vitals', label: 'Readings & lab values', render: (v) => <><b>{v.label}</b> — {v.type === 'BP' ? `${v.value}/${v.value2}` : v.value} {v.unit}{v.originalUnit && !['%', v.unit].includes(v.originalUnit) && <span className="text-ink-4"> (converted from {v.originalUnit})</span>} · {fmtDate(v.at)}</> },
  { key: 'documents', label: 'Reports & documents', render: (d) => <><b>{d.title}</b> — {RECORD_CATEGORIES[d.category]} · {fmtDate(d.date)} · {bytes(d.size)}</> },
  { key: 'conditions', label: 'Conditions', render: (c) => <><b>{c.name}</b>{c.status === 'RESOLVED' ? ' (resolved)' : ''}{c.since ? ` · since ${fmtDate(c.since)}` : ''}</> },
  { key: 'allergies', label: 'Allergies', render: (a) => <><b>{a.name}</b> — {a.severity.toLowerCase()}{a.reaction ? ` · ${a.reaction}` : ''}</> },
  { key: 'immunizations', label: 'Vaccinations', render: (i) => <><b>{i.name}</b>{i.dose ? ` ${i.dose}` : ''} · {fmtDate(i.date)}</> },
  { key: 'medications', label: 'Medicines (saved as a prescription note)', render: (m) => <><b>{m.name}</b>{m.instructions ? ` — ${m.instructions}` : ''}</> },
];

function Preview({ preview, member, onImport, onCancel, busy }) {
  const [include, setInclude] = useState(Object.fromEntries(SECTIONS.map((s) => [s.key, true])));
  const [confirmed, setConfirmed] = useState(false);
  const s = preview.source;
  const fresh = (k) => (preview[k] || []).filter((x) => !x.duplicate && x.valid !== false).length;
  const total = SECTIONS.reduce((n, sec) => n + (include[sec.key] ? (sec.key === 'medications' ? (preview.medications.length ? 1 : 0) : fresh(sec.key)) : 0), 0);
  const needsConfirm = preview.warnings.length > 0;
  return (
    <Card>
      <CardHeader title={`${s.kind}${s.facility ? ` · ${s.facility}` : ''}`} subtitle={`${s.date ? fmtDate(s.date) : 'Undated'}${s.patient?.name ? ` · for ${s.patient.name}` : ''}`} icon={LuFileJson} />
      <div className="space-y-5 p-5">
        {needsConfirm && (
          <div className="rounded-2xl border border-bad/20 bg-bad-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-bad"><LuTriangleAlert className="h-4 w-4" />Check this is {firstName(member.name)}’s record</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            <Checkbox className="mt-3" checked={confirmed} onChange={setConfirmed} label={`I’ve checked — this record belongs to ${member.name}`} />
          </div>
        )}
        {SECTIONS.filter((sec) => preview[sec.key]?.length).map((sec) => (
          <div key={sec.key}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Checkbox checked={include[sec.key]} onChange={(x) => setInclude((i) => ({ ...i, [sec.key]: x }))} label={<span className="font-semibold">{sec.label}</span>} />
              {sec.key !== 'medications' && <span className="text-xs text-ink-3">{fresh(sec.key)} new</span>}
            </div>
            <ul className={clsx('space-y-1.5 rounded-2xl bg-paper p-3 text-sm', !include[sec.key] && 'opacity-40')}>
              {preview[sec.key].map((x, i) => (
                <li key={i} className={clsx('flex items-start justify-between gap-3', (x.duplicate || x.valid === false) && 'text-ink-4')}>
                  <span>{sec.render(x)}</span>
                  {x.duplicate ? <Badge>Already saved</Badge> : x.valid === false ? <Badge tone="bad" title={x.problem}>Won’t import</Badge> : null}
                </li>
              ))}
            </ul>
            {sec.key === 'vitals' && preview.vitals.some((v) => v.valid === false) && <p className="mt-1 text-xs text-ink-3">Values outside the possible range are skipped — check the original report.</p>}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button loading={busy} disabled={!total || (needsConfirm && !confirmed)} onClick={() => onImport(include)}>Import {total} item{total === 1 ? '' : 's'}</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <p className="text-xs text-ink-3">Nothing is overwritten — items are only added, each marked “via ABHA”.</p>
        </div>
      </div>
    </Card>
  );
}

function Importer({ member }) {
  const { canWrite } = useHousehold();
  const quick = useQuickAdd();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [drag, setDrag] = useState(false);

  const form = (f, include) => { const fd = new FormData(); fd.append('file', f); if (include) fd.append('include', JSON.stringify(include)); return fd; };
  const load = async (f) => {
    if (!f) return;
    setBusy('preview'); setResult(null);
    try { const r = await api.upload(`/abha/${member._id}/preview`, form(f)); setFile(f); setPreview(r.preview); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };
  const trySample = async () => {
    setBusy('sample');
    try {
      const res = await http.get(`/abha/${member._id}/sample`);
      await load(new File([JSON.stringify(res.data)], 'sample-abdm-record.json', { type: 'application/json' }));
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };
  const doImport = async (include) => {
    setBusy('import');
    try {
      const r = await api.upload(`/abha/${member._id}/import`, form(file, include));
      setResult(r.result); setPreview(null); setFile(null);
      invalidate('/vitals', '/records', '/vaccines', '/members', '/predict', '/today', '/scores', '/family-tree');
      toast.success('Imported');
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };

  const a = member.abha || {};
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#0B5D8A] to-[#0B2239] p-5 text-white">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60"><LuIdCard className="h-4 w-4" />ABHA</p>
            <p className="mt-3 font-mono text-xl tracking-wider">{a.number || 'XX-XXXX-XXXX-XXXX'}</p>
            <p className="mt-1 text-sm text-white/70">{a.address || 'No ABHA address saved'}</p>
            <p className="mt-4 text-sm font-medium">{member.name}</p>
          </div>
          {canWrite && <div className="p-4"><Button size="sm" variant="secondary" icon={LuPencil} onClick={() => quick.open('member', { memberDoc: member, section: 'basics' })}>{a.number || a.address ? 'Edit ABHA' : 'Add ABHA number'}</Button></div>}
        </Card>
        <Card className="p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold"><LuInfo className="h-4 w-4 text-info" />How records get here</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-2">
            <li>Hospitals, labs and apps on ABDM share health records as FHIR files (the national NRCeS format). Save the .json file they or your ABHA app give you.</li>
            <li>Drop it here. You see everything before it’s saved, with lab values converted to the units used here and duplicates marked.</li>
          </ol>
          <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink-3">Fetching records straight from hospitals by consent needs ArogyaKosh to be registered as an app on the ABDM network. That isn’t switched on in this installation yet; when it is, those records will arrive through this same importer.</p>
        </Card>
      </div>

      <div className="space-y-6">
        {result && (
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold text-ok"><LuCircleCheck className="h-5 w-5" />Import complete</p>
            <p className="mt-2 text-sm text-ink-2">
              {[['vitals', 'reading'], ['documents', 'document'], ['conditions', 'condition'], ['allergies', 'allergy', 'allergies'], ['immunizations', 'vaccination'], ['medications', 'medicine']].filter(([k]) => result[k]).map(([k, one, many]) => `${result[k]} ${result[k] === 1 ? one : many || `${one}s`}${k === 'medications' ? ' (as a prescription note)' : ''}`).join(', ') || 'Nothing new'}{result.skipped ? ` · ${result.skipped} skipped` : ''}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" to="/app/vitals">See readings</Button>
              <Button size="sm" variant="secondary" to="/app/records">Open locker</Button>
              <Button size="sm" variant="ghost" to={`/app/predict?member=${member._id}`}>Updated predictions</Button>
            </div>
          </Card>
        )}
        {preview ? <Preview preview={preview} member={member} busy={busy === 'import'} onImport={doImport} onCancel={() => { setPreview(null); setFile(null); }} /> : canWrite && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files?.[0]); }}
            className={clsx('rounded-3xl border-2 border-dashed p-10 text-center transition-colors', drag ? 'border-ink bg-paper' : 'border-line bg-surface')}>
            <LuUpload className="mx-auto h-8 w-8 text-ink-3" />
            <p className="mt-3 font-semibold">Drop an ABDM health record (.json)</p>
            <p className="mt-1 text-sm text-ink-3">Prescription, diagnostic report, discharge summary, OP consultation or immunization record</p>
            <input ref={input} type="file" accept=".json,application/json,application/fhir+json" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button loading={busy === 'preview'} onClick={() => input.current?.click()}>Choose file</Button>
              <Button variant="secondary" icon={LuSparkles} loading={busy === 'sample'} onClick={trySample}>Try a sample record</Button>
            </div>
            <p className="mt-3 text-xs text-ink-4">The sample is a synthetic lab report addressed to {firstName(member.name)}, clearly marked SAMPLE.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Abha() {
  const { data, loading } = useApi('/members');
  const [sel, setSel] = useState(null);
  const members = data?.items || [];
  const member = members.find((m) => m._id === sel) || members[0];
  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] bg-info-soft p-6 sm:p-10">
        <div className="relative max-w-2xl">
          <p className="eyebrow flex items-center gap-2 text-info"><LuIdCard className="h-4 w-4" />ABHA · Ayushman Bharat Digital Mission</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[38px]">Bring in records from hospitals on India’s health network.</h1>
          <p className="mt-3 text-[15px] text-ink-2">Save each person’s ABHA number, then import the records hospitals and labs share in the national format. Lab values land in charts and predictions, reports in the locker — no retyping.</p>
        </div>
      </div>
      {loading || !member ? <Skeleton className="h-96" /> : (
        <>
          <Tabs className="mb-6" value={member._id} onChange={setSel} tabs={members.map((m) => ({ value: m._id, label: <span className="flex items-center gap-1.5">{m.isSelf ? 'You' : firstName(m.name)}{m.abha?.number || m.abha?.address ? <LuCircleCheck className="h-3.5 w-3.5 text-ok" /> : null}</span> }))} />
          <Importer key={member._id} member={member} />
        </>
      )}
      <p className="mt-8 text-xs text-ink-3">ABHA and ABDM are initiatives of the National Health Authority, Government of India. ArogyaKosh is not affiliated with them.</p>
    </div>
  );
}
