import { Fragment, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuMessageCircle, LuSendHorizontal, LuCheck, LuCheckCheck, LuBellRing, LuInfo, LuSmartphone, LuCircleAlert } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useHousehold } from '../../context/HouseholdContext';
import { Card, Avatar, Badge, Skeleton } from '../../components/ui/Display';
import { Segmented } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { fmtTime, firstName } from '../../lib/format';

const STATUS = {
  OFF: { tone: 'neutral', label: 'Off' },
  PENDING: { tone: 'warn', label: 'Waiting for YES' },
  ACTIVE: { tone: 'ok', label: 'Active' },
  STOPPED: { tone: 'bad', label: 'Stopped by them' },
};
const pretty = (p) => (p ? `+${p.slice(0, p.length - 10)} ${p.slice(-10, -5)} ${p.slice(-5)}` : '');

/** WhatsApp-style *bold*. */
const Rich = ({ text }) => text.split('\n').map((line, i) => (
  <Fragment key={i}>
    {i > 0 && <br />}
    {line.split(/(\*[^*]+\*)/g).map((part, j) => (part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <b key={j}>{part.slice(1, -1)}</b> : part))}
  </Fragment>
));

function MemberRow({ m, selected, onSelect, canWrite }) {
  const [phone, setPhone] = useState(m.whatsapp?.phone ? pretty(m.whatsapp.phone) : m.phone || '');
  const [lang, setLang] = useState(m.whatsapp?.lang || 'hi');
  const [busy, setBusy] = useState(false);
  const st = STATUS[m.whatsapp?.status || 'OFF'];
  const save = async (enabled) => {
    setBusy(true);
    try {
      const r = await api.put(`/whatsapp/${m._id}`, { phone, lang, enabled });
      toast.success(enabled ? (r.member.whatsapp.status === 'ACTIVE' ? 'Reminders are on' : 'Consent request sent — they reply YES to start') : 'Turned off');
      invalidate('/whatsapp');
      onSelect(m._id);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const on = m.whatsapp?.status && m.whatsapp.status !== 'OFF';
  return (
    <div className={clsx('rounded-2xl border p-4 transition-colors', selected ? 'border-ink bg-surface shadow-card' : 'border-line bg-surface hover:border-ink-4')}>
      <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(m._id)}>
        <Avatar name={m.name} color={m.color} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{m.name}</p>
          <p className="text-xs text-ink-3">{on ? pretty(m.whatsapp.phone) : 'Not set up'}</p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </button>
      {selected && canWrite && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            <input className="input h-10 min-w-0 flex-1" type="tel" placeholder="+91 98200 12345" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="WhatsApp number" />
            <Segmented size="sm" value={lang} onChange={setLang} options={[['hi', 'Hinglish'], ['en', 'English']]} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={busy} onClick={() => save(true)}>{on ? 'Save' : 'Turn on'}</Button>
            {on && <Button size="sm" variant="ghost" onClick={() => save(false)}>Turn off</Button>}
          </div>
          {m.whatsapp?.status === 'STOPPED' && <p className="text-xs text-bad">They replied STOP. Reminders resume only if they reply START.</p>}
        </div>
      )}
    </div>
  );
}

function Phone({ member, simulator, canWrite }) {
  const { data, reload } = useApi(member ? `/whatsapp/${member._id}/messages` : null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const scroller = useRef(null);
  const items = data?.items || [];
  useEffect(() => { scroller.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [items.length]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 10000);
    return () => clearInterval(id);
  }, [reload]);

  if (!member) return null;
  const status = member.whatsapp?.status || 'OFF';
  const reply = async (t) => {
    if (!t.trim()) return;
    setBusy('reply'); setText('');
    try {
      await api.post(`/whatsapp/${member._id}/simulate`, { text: t });
      await Promise.all([reload(), invalidate('/whatsapp', '/today', '/medicines', '/activity')]);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };
  const test = async () => {
    setBusy('test');
    try { const r = await api.post(`/whatsapp/${member._id}/test`, {}); await reload(); toast.success(r.message?.simulated ? 'Reminder sent to the simulator' : 'Reminder sent'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="overflow-hidden rounded-[36px] border-[10px] border-ink bg-ink shadow-pop">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold">ak</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">ArogyaKosh</p>
            <p className="truncate text-[11px] text-white/70">{simulator ? `Simulator · ${firstName(member.name)}'s phone` : `${pretty(member.whatsapp?.phone)}`}</p>
          </div>
        </div>
        <div ref={scroller} className="h-[460px] space-y-2 overflow-y-auto bg-[#ECE5DD] px-3 py-4">
          {!items.length && <p className="mx-auto mt-24 max-w-[240px] rounded-xl bg-white/70 p-3 text-center text-xs text-ink-3">{status === 'OFF' ? 'Turn on WhatsApp for this person to see the conversation here.' : 'No messages yet.'}</p>}
          {items.map((m) => {
            const out = m.direction === 'OUT';
            return (
              <div key={m._id} className={clsx('flex', out ? 'justify-start' : 'justify-end')}>
                <div className={clsx('max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-snug text-[#111B21] shadow-sm', out ? 'rounded-tl-sm bg-white' : 'rounded-tr-sm bg-[#D9FDD3]')}>
                  <Rich text={m.body} />
                  <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                    {fmtTime(m.createdAt)}
                    {out && m.status === 'READ' && <LuCheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />}
                    {out && m.status === 'DELIVERED' && <LuCheckCheck className="h-3.5 w-3.5" />}
                    {out && ['SENT', 'SIMULATED'].includes(m.status) && <LuCheck className="h-3.5 w-3.5" />}
                    {out && m.status === 'FAILED' && <LuCircleAlert className="h-3.5 w-3.5 text-bad" title={m.error} />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {simulator && canWrite && status !== 'OFF' ? (
          <div className="space-y-2 bg-[#F0F2F5] p-2">
            <div className="flex gap-1.5">
              {['1', '2', 'YES', 'STOP'].map((q) => (
                <button key={q} type="button" disabled={Boolean(busy)} onClick={() => reply(q)} className="h-8 flex-1 rounded-full bg-white text-xs font-semibold text-[#075E54] shadow-sm hover:bg-[#D9FDD3]">{q}</button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); reply(text); }}>
              <input className="h-10 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-sm outline-none" placeholder="Reply as them, e.g. haan / le li" value={text} onChange={(e) => setText(e.target.value)} aria-label="Simulated reply" />
              <button type="submit" disabled={busy === 'reply'} className="grid h-10 w-10 place-items-center rounded-full bg-[#00A884] text-white" aria-label="Send"><LuSendHorizontal className="h-4 w-4" /></button>
            </form>
          </div>
        ) : <div className="h-3 bg-[#F0F2F5]" />}
      </div>
      {canWrite && status === 'ACTIVE' && (
        <Button className="mt-4 w-full" variant="secondary" icon={LuBellRing} loading={busy === 'test'} onClick={test}>Send the next reminder now</Button>
      )}
    </div>
  );
}

export default function WhatsApp() {
  const { data, loading } = useApi('/whatsapp');
  const { canWrite } = useHousehold();
  const [sel, setSel] = useState(null);
  const members = data?.members || [];
  const selected = members.find((m) => m._id === sel) || members.find((m) => m.whatsapp?.status === 'ACTIVE') || members.find((m) => !m.isSelf) || members[0];

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-[32px] bg-[#E7F8EE] p-6 sm:p-10">
        <div className="relative max-w-2xl">
          <p className="eyebrow flex items-center gap-2 text-[#128C7E]"><LuMessageCircle className="h-4 w-4" />Dose check-off on WhatsApp</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[38px]">Parents reply “1”. The dose is logged. No app to learn.</h1>
          <p className="mt-3 text-[15px] text-ink-2">At each dose time they get a WhatsApp message in Hinglish or English. Replying 1 (or “haan”, “le li”) marks it taken; 2 skips it. If nothing comes back, one gentle nudge goes out after 30 minutes, then the family gets the usual missed-dose alert.</p>
        </div>
      </div>

      {loading || !data ? <Skeleton className="h-[560px]" /> : (
        <>
          {data.simulator ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-info/20 bg-info-soft p-4 text-sm text-ink-2">
              <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p>{data.live
                ? 'This is a sample family, so messages stay in the simulator — nothing is sent to real phones.'
                : <>Simulator mode: messages appear in the phone on the right instead of being sent. To send real WhatsApp messages, the server needs a WhatsApp Business number — set <code className="rounded bg-white px-1">WHATSAPP_TOKEN</code>, <code className="rounded bg-white px-1">WHATSAPP_PHONE_NUMBER_ID</code>, <code className="rounded bg-white px-1">WHATSAPP_APP_SECRET</code>, <code className="rounded bg-white px-1">WHATSAPP_VERIFY_TOKEN</code> and approved templates, then point Meta's webhook at <code className="rounded bg-white px-1">/api/webhooks/whatsapp</code>.</>}</p>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ok/20 bg-ok-soft p-4 text-sm text-ok"><LuSmartphone className="h-4 w-4" />Connected to WhatsApp Business — reminders go to real phones.</div>
          )}
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <div className="space-y-3">
              <p className="text-sm text-ink-3">Choose who gets reminders. Two people on one phone (e.g. both parents) get one combined message, and one reply logs both.</p>
              {members.map((m) => <MemberRow key={m._id} m={m} selected={selected?._id === m._id} onSelect={setSel} canWrite={canWrite} />)}
              <Card className="p-5">
                <p className="text-sm font-semibold">What they can reply</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="font-mono font-semibold">1</dt><dd className="text-ink-2">Taken — also “haan”, “le li”, “done”, “ok”, 👍</dd>
                  <dt className="font-mono font-semibold">2</dt><dd className="text-ink-2">Skipped — also “nahi”, “skip”, “no”</dd>
                  <dt className="font-mono font-semibold">STOP</dt><dd className="text-ink-2">Turns reminders off. START turns them back on.</dd>
                </dl>
                <p className="mt-3 text-xs text-ink-3">Reminders start only after they reply YES to the first message — their consent, as WhatsApp requires.</p>
              </Card>
            </div>
            <Phone key={selected?._id} member={selected} simulator={data.simulator} canWrite={canWrite} />
          </div>
        </>
      )}
    </div>
  );
}
