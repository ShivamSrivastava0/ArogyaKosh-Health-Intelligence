import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPrinter, LuShare2, LuSparkles, LuCopy, LuEye, LuBan, LuMessageCircle } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { PageSkeleton, ErrorNote, Badge, Card } from '../../components/ui/Display';
import { Modal } from '../../components/ui/Overlay';
import { Segmented, Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import BriefDocument from '../../components/BriefDocument';
import { fmtDateTime, relDays, fmtDate } from '../../lib/format';

function ShareModal({ open, onClose, member, records }) {
  const [duration, setDuration] = useState('24h');
  const [picked, setPicked] = useState([]);
  const [label, setLabel] = useState('');
  const [link, setLink] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data } = useApi(open ? '/share' : null, { member: member._id });
  const url = link ? `${window.location.origin}/s/${link.token}` : '';

  const create = async () => {
    setSaving(true);
    try {
      const r = await api.post('/share', { member: member._id, duration, records: picked, label });
      setLink(r.link);
      invalidate('/share');
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  const revoke = async (id) => {
    try { await api.post(`/share/${id}/revoke`); await invalidate('/share'); toast.success('Link revoked'); } catch (e) { toast.error(errorMessage(e)); }
  };
  const close = () => { setLink(null); setPicked([]); setLabel(''); onClose(); };

  return (
    <Modal open={open} onClose={close} size="lg" title={`Share ${member.name.split(' ')[0]}'s summary`} description="The doctor opens a read-only page — no app or login needed. The link expires on its own and you can revoke it any time."
      footer={link ? <Button onClick={close}>Done</Button> : <><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={saving} onClick={create}>Create link</Button></>}>
      {link ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-2 pl-4">
            <code className="flex-1 truncate font-mono text-xs">{url}</code>
            <Button size="sm" icon={LuCopy} onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}>Copy</Button>
          </div>
          <Button variant="secondary" icon={LuMessageCircle} href={`https://wa.me/?text=${encodeURIComponent(`Health summary for ${member.name} (expires ${fmtDateTime(link.expiresAt)}): ${url}`)}`} target="_blank" rel="noreferrer">Send on WhatsApp</Button>
          <p className="text-[13px] text-ink-3">Expires {fmtDateTime(link.expiresAt)}. Includes {picked.length || 'no'} attached record{picked.length === 1 ? '' : 's'}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="label">Link valid for</p>
            <Segmented value={duration} onChange={setDuration} options={[['1h', '1 hour'], ['24h', '24 hours'], ['3d', '3 days'], ['7d', '7 days'], ['30d', '30 days']]} />
          </div>
          <Input label="Label" optional placeholder="Dr. Menon — cardiology visit" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div>
            <p className="label">Attach records <span className="font-normal text-ink-4">the doctor can open these files</span></p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
              {records.length ? records.map((r) => (
                <label key={r._id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={picked.includes(r._id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r._id] : p.filter((x) => x !== r._id)))} />
                  <span className="flex-1 text-sm">{r.title}</span><span className="text-xs text-ink-3">{fmtDate(r.date)}</span>
                </label>
              )) : <p className="px-2 py-3 text-sm text-ink-3">No records for this member yet.</p>}
            </div>
          </div>
          {data?.items?.length > 0 && (
            <div>
              <p className="label">Previous links</p>
              <ul className="divide-y divide-line-soft rounded-2xl border border-line">
                {data.items.slice(0, 6).map((l) => (
                  <li key={l._id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span className="flex-1 truncate">{l.label || 'Untitled link'} <span className="text-ink-3">· {fmtDate(l.createdAt)}</span></span>
                    <span className="flex items-center gap-1 text-ink-3"><LuEye className="h-3.5 w-3.5" />{l.views}</span>
                    {l.active ? <><Badge tone="ok">Expires {relDays(l.expiresAt).toLowerCase()}</Badge><Button size="xs" variant="danger-ghost" icon={LuBan} onClick={() => revoke(l._id)}>Revoke</Button></> : <Badge>{l.revoked ? 'Revoked' : 'Expired'}</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Brief() {
  const { id } = useParams();
  const { config } = useFamily();
  const [ai, setAi] = useState(false);
  const [share, setShare] = useState(false);
  const { data, loading, error, reload } = useApi(`/members/${id}/brief`, ai ? { ai: 1 } : undefined);
  const { data: recs } = useApi('/records', { member: id });

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorNote message={error || 'Could not build the brief'} onRetry={reload} />;
  const { brief } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to={`/app/family/${id}`} className="mb-2 inline-flex text-[13px] font-medium text-ink-3 hover:text-ink">← {brief.patient.name}</Link>
          <h1 className="text-[28px] font-semibold sm:text-[34px]">Doctor brief</h1>
          <p className="mt-1 text-[15px] text-ink-3">Everything a doctor needs in two minutes. Print it, save as PDF, or share a secure link.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.ai && <Button variant={ai ? 'accent' : 'secondary'} icon={LuSparkles} onClick={() => setAi((x) => !x)}>{ai ? 'AI summary on' : 'Add AI summary'}</Button>}
          <Button variant="secondary" icon={LuPrinter} onClick={() => window.print()}>Print / PDF</Button>
          <Button icon={LuShare2} onClick={() => setShare(true)}>Share with doctor</Button>
        </div>
      </div>
      {brief.aiNote && <Card className="no-print mb-4 p-4 text-sm text-ink-3">{brief.aiNote}</Card>}
      <BriefDocument brief={brief} />
      <ShareModal open={share} onClose={() => setShare(false)} member={brief.patient} records={recs?.items || []} />
    </div>
  );
}
