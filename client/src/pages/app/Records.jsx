import { useEffect, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  LuPlus, LuFileText, LuSearch, LuLayoutGrid, LuList, LuDownload, LuPencil, LuTrash2, LuSparkles, LuFlaskConical,
  LuPill, LuScanLine, LuReceipt, LuShieldCheck, LuSyringe, LuClipboardList, LuFile, LuPaperclip,
} from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, PageHeader, Empty, MemberChip, Badge, KeyValue, Skeleton } from '../../components/ui/Display';
import { Drawer, useConfirm } from '../../components/ui/Overlay';
import { Checkbox } from '../../components/ui/Field';
import Button, { Spinner } from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import { MemberFilter } from './Medicines';
import { LabArt } from '../../components/illustrations';
import { RECORD_CATEGORIES } from '../../lib/constants';
import { fmtDate, bytes } from '../../lib/format';

const CAT_ICON = {
  PRESCRIPTION: LuPill, LAB_REPORT: LuFlaskConical, IMAGING: LuScanLine, DISCHARGE_SUMMARY: LuClipboardList,
  VACCINATION: LuSyringe, INSURANCE: LuShieldCheck, BILL: LuReceipt, OTHER: LuFile,
};
const CAT_TINT = {
  PRESCRIPTION: 'bg-tint-lilac', LAB_REPORT: 'bg-tint-sky', IMAGING: 'bg-tint-peach', DISCHARGE_SUMMARY: 'bg-tint-sand',
  VACCINATION: 'bg-tint-mint', INSURANCE: 'bg-tint-sun', BILL: 'bg-tint-rose', OTHER: 'bg-paper',
};

export const CategoryIcon = ({ category, className = 'h-10 w-10' }) => {
  const Icon = CAT_ICON[category] || LuFile;
  return <span className={clsx('grid shrink-0 place-items-center rounded-xl', CAT_TINT[category], className)}><Icon className="h-[18px] w-[18px]" /></span>;
};

function Extractor({ record, onDone }) {
  const [state, setState] = useState({ step: 'idle' });
  const [picked, setPicked] = useState({});
  const run = async () => {
    setState({ step: 'reading' });
    try {
      const res = await api.post(`/records/${record._id}/extract`);
      setState({ step: 'review', ...res });
      // Only values that pass every check start ticked; the user must opt in to anything else.
      setPicked(Object.fromEntries(res.values.map((v, i) => [i, v.known && v.plausible])));
      invalidate('/records');
    } catch (e) {
      setState({ step: 'error', message: errorMessage(e) });
    }
  };
  const save = async () => {
    const values = state.values.filter((_, i) => picked[i]);
    try {
      const r = await api.post(`/records/${record._id}/values`, { values, date: state.reportDate || undefined });
      toast.success(`${r.count} value(s) added to trends`);
      if (r.skipped?.length) toast.error(`${r.skipped.length} value(s) failed safety checks and were not saved`);
      await invalidate('/vitals', '/today', '/scores');
      onDone?.();
      setState({ step: 'saved' });
    } catch (e) { toast.error(errorMessage(e)); }
  };

  if (state.step === 'idle') {
    return (
      <div className="rounded-2xl border border-line bg-lime-soft/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><LuSparkles className="h-4 w-4" />Read this report</p>
        <p className="mt-1 text-[13px] text-ink-2">Pull out values like HbA1c, LDL or TSH so they're charted with the rest of the readings. You review everything before it's saved.</p>
        <Button size="sm" className="mt-3" onClick={run}>Read report</Button>
      </div>
    );
  }
  if (state.step === 'reading') return <div className="flex items-center gap-3 rounded-2xl bg-paper p-4 text-sm"><Spinner /> Reading the report… this takes 10–20 seconds.</div>;
  if (state.step === 'error') return <div className="rounded-2xl bg-bad-soft p-4 text-sm text-bad">{state.message} <button type="button" className="ml-2 font-semibold underline" onClick={run}>Try again</button></div>;
  if (state.step === 'saved') return <div className="rounded-2xl bg-ok-soft p-4 text-sm font-medium text-ok">Values added to Vitals & labs.</div>;

  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <p className="text-sm font-semibold">Found {state.values.length} value(s){state.reportDate ? ` · report dated ${fmtDate(state.reportDate)}` : ''}</p>
      <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">AI can misread reports. Compare each number with the report above before adding it.</p>
      {state.summary && <p className="text-[13px] leading-relaxed text-ink-2">{state.summary}</p>}
      <ul className="divide-y divide-line-soft">
        {state.values.map((v, i) => (
          <li key={`${v.name}-${i}`} className="py-2">
            <div className="flex items-center justify-between gap-3">
              <Checkbox checked={Boolean(picked[i])} onChange={(c) => setPicked((p) => ({ ...p, [i]: c }))} label={<span className={clsx((!v.known || !v.plausible) && 'text-ink-4')}>{v.name}</span>} />
              <span className="tnum text-[13px] font-semibold">{v.value}{v.value2 ? `/${v.value2}` : ''} <span className="font-normal text-ink-3">{v.unit}</span></span>
            </div>
            {v.issue && <p className="ml-6 mt-1 text-xs text-bad">Failed check: {v.issue}</p>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-3">Greyed items aren't tracked as trends or failed a plausibility check. Values that fail checks are refused even if ticked.</p>
      <Button size="sm" onClick={save} disabled={!Object.values(picked).some(Boolean)}>Add selected to trends</Button>
    </div>
  );
}

function RecordDrawer({ record, onClose }) {
  const { config } = useFamily();
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const [url, setUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    let revoked = null;
    setUrl(null);
    if (record?.hasFile) {
      setLoadingFile(true);
      api.blob(`/records/${record._id}/file`).then((u) => { revoked = u; setUrl(u); }).catch(() => toast.error('Could not load the file')).finally(() => setLoadingFile(false));
    }
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [record?._id, record?.hasFile]);

  if (!record) return <Drawer open={false} onClose={onClose} title="" />;
  const isImage = record.file?.mime?.startsWith('image/');

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this record?', body: `"${record.title}" and its file will be permanently deleted.`, danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/records/${record._id}`);
      await invalidate('/records');
      toast.success('Deleted');
      onClose();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Drawer open onClose={onClose} title={record.title} description={`${RECORD_CATEGORIES[record.category]} · ${fmtDate(record.date)}`} width="max-w-3xl"
      footer={<>
        <Button variant="danger-ghost" icon={LuTrash2} onClick={remove} className="mr-auto">Delete</Button>
        <Button variant="secondary" icon={LuPencil} onClick={() => { onClose(); quick.open('record', { record }); }}>Edit</Button>
        {url && <Button icon={LuDownload} href={url} download={record.file?.name || record.title}>Download</Button>}
      </>}>
      <div className="space-y-6">
        {record.hasFile && (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            {loadingFile && <div className="grid h-80 place-items-center"><Spinner className="h-5 w-5 text-ink-3" /></div>}
            {url && (isImage ? <img src={url} alt={record.title} className="max-h-[70vh] w-full object-contain" /> : <iframe src={url} title={record.title} className="h-[70vh] w-full" />)}
          </div>
        )}
        {record.summary && (
          <div className="rounded-2xl bg-paper p-4">
            <p className="eyebrow mb-1.5 flex items-center gap-2">Summary {record.summarySource === 'AI' && <Badge tone="info">AI-written · verify against the report</Badge>}</p>
            <p className="text-sm leading-relaxed text-ink-2">{record.summary}</p>
          </div>
        )}
        {config.ai && record.hasFile && ['LAB_REPORT', 'OTHER', 'DISCHARGE_SUMMARY'].includes(record.category) && <Extractor record={record} />}
        <dl className="divide-y divide-line-soft">
          <KeyValue label="For"><MemberChip member={record.member} /></KeyValue>
          <KeyValue label="Doctor">{record.doctor}</KeyValue>
          <KeyValue label="Hospital / lab">{record.facility}</KeyValue>
          <KeyValue label="Tags">{record.tags?.length ? <span className="flex flex-wrap justify-end gap-1">{record.tags.map((t) => <Badge key={t}>{t}</Badge>)}</span> : null}</KeyValue>
          <KeyValue label="File">{record.hasFile ? `${record.file.name} · ${bytes(record.file.size)}` : 'No file attached'}</KeyValue>
        </dl>
        {record.notes && <p className="whitespace-pre-wrap text-sm text-ink-2">{record.notes}</p>}
      </div>
    </Drawer>
  );
}

/** Record list (grid or table). Reused on member profiles. */
export function RecordList({ member, category, q, view = 'grid' }) {
  const quick = useQuickAdd();
  const [open, setOpen] = useState(null);
  const { data, loading } = useApi('/records', { member: member || undefined, category: category || undefined, q: q || undefined });
  const items = data?.items || [];
  const current = open ? items.find((r) => r._id === open) : null;

  const empty = (
    <Card><Empty art={LabArt} title={q || category ? 'No matching records' : 'Your health locker is empty'}
      body={q || category ? 'Try a different search or filter.' : 'Upload prescriptions, lab reports, scans and bills. Find any of them in seconds — even years later.'}
      action={!q && <Button size="sm" icon={LuPlus} onClick={() => quick.open('record', { member })}>Upload a record</Button>} /></Card>
  );

  return (
    <>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : !items.length ? empty : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <button key={r._id} type="button" onClick={() => setOpen(r._id)} className="card group flex flex-col p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ink-4">
              <div className="flex items-start justify-between gap-3">
                <CategoryIcon category={r.category} />
                {r.hasFile && <span className="flex items-center gap-1 text-2xs font-medium text-ink-3"><LuPaperclip className="h-3 w-3" />{r.file.mime?.includes('pdf') ? 'PDF' : 'Image'}</span>}
              </div>
              <p className="mt-4 line-clamp-2 font-semibold leading-snug">{r.title}</p>
              <p className="mt-1 text-xs text-ink-3">{RECORD_CATEGORIES[r.category]} · {fmtDate(r.date)}{r.facility ? ` · ${r.facility}` : ''}</p>
              {r.summary && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{r.summary}</p>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <MemberChip member={r.member} />
                <div className="flex gap-1">{r.tags?.slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <DataTable rows={items} onRowClick={(r) => setOpen(r._id)}
            columns={[
              { key: 'title', header: 'Record', mobile: 'title', render: (r) => (
                <div className="flex items-center gap-3"><CategoryIcon category={r.category} className="h-9 w-9" />
                  <div className="min-w-0"><p className="truncate font-semibold">{r.title}</p><p className="text-xs text-ink-3">{RECORD_CATEGORIES[r.category]}</p></div></div>
              ) },
              !member && { key: 'member', header: 'For', render: (r) => <MemberChip member={r.member} /> },
              { key: 'date', header: 'Date', render: (r) => <span className="text-[13px]">{fmtDate(r.date)}</span> },
              { key: 'facility', header: 'Where', mobile: 'hide', render: (r) => <span className="text-[13px] text-ink-3">{[r.doctor, r.facility].filter(Boolean).join(' · ')}</span> },
              { key: 'file', header: '', align: 'right', mobile: 'end', render: (r) => r.hasFile && <LuPaperclip className="ml-auto h-4 w-4 text-ink-3" /> },
            ].filter(Boolean)} />
        </Card>
      )}
      <RecordDrawer record={current} onClose={() => setOpen(null)} />
    </>
  );
}

export default function Records() {
  const quick = useQuickAdd();
  const [member, setMember] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState(() => localStorage.getItem('ak.records.view') || 'grid');

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { try { localStorage.setItem('ak.records.view', view); } catch { /* ignore */ } }, [view]);

  return (
    <div>
      <PageHeader title="Health locker" subtitle="Every prescription, report, scan and bill — searchable, private, and ready to share with a doctor."
        actions={<Button icon={LuPlus} onClick={() => quick.open('record', { member })}>Upload</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, doctor, lab, tag…" className="input rounded-full pl-10" />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          {[['grid', LuLayoutGrid], ['list', LuList]].map(([v, Icon]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-label={`${v} view`}
              className={clsx('grid h-8 w-8 place-items-center rounded-full', view === v ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
      </div>
      <div className="mb-6 flex flex-col gap-3">
        <MemberFilter value={member} onChange={setMember} />
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {[['', 'All types'], ...Object.entries(RECORD_CATEGORIES)].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setCategory(k)}
              className={clsx('h-8 shrink-0 rounded-full border px-3 text-xs font-medium', category === k ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-4')}>{l}</button>
          ))}
        </div>
      </div>
      <RecordList member={member} category={category} q={q} view={view} />
    </div>
  );
}
