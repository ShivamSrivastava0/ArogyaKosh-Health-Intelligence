import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { LuSend, LuSparkles, LuDatabase, LuSiren, LuRotateCcw } from 'react-icons/lu';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { PageHeader, Badge } from '../../components/ui/Display';
import Button, { Spinner } from '../../components/ui/Button';
import Markdown from '../../components/ui/Markdown';
import { LogoMark } from '../../components/ui/Logo';
import { firstName } from '../../lib/format';

const KEY = 'ak.assistant.history';
const MODE = {
  ai: { label: 'AI · grounded in your records', icon: LuSparkles, tone: 'lime' },
  records: { label: 'From your records', icon: LuDatabase, tone: 'neutral' },
  safety: { label: 'Safety', icon: LuSiren, tone: 'bad' },
};

export default function Assistant() {
  const { members, config } = useFamily();
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const parent = members.find((m) => ['FATHER', 'MOTHER'].includes(m.relation));
  const suggestions = [
    parent ? `What medicines does ${firstName(parent.name)} take?` : 'What medicines am I taking?',
    parent ? `What is ${firstName(parent.name)}'s heart age and risk?` : 'What is my heart age?',
    'Whose health is trending the wrong way?',
    parent ? `What was ${firstName(parent.name)}'s latest BP?` : 'What was my latest BP?',
    'Which vaccines are due?',
    'Any medicines running low?',
    config.ai ? 'How can I keep blood sugar in check with an Indian diet?' : 'What are everyone\'s allergies?',
  ];

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api.post('/assistant', { message, history });
      setMessages((m) => [...m, { role: 'assistant', content: r.reply, mode: r.mode }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: errorMessage(e), mode: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <PageHeader title="Ask Kosh" subtitle="Ask about risks, forecasts, medicines, readings and appointments — answered from your family's records and ArogyaPredict."
        actions={messages.length > 0 && <Button variant="secondary" size="sm" icon={LuRotateCcw} onClick={() => setMessages([])}>New chat</Button>} />

      <div className="flex-1 space-y-5 pb-6">
        {!messages.length && (
          <div className="card p-6 sm:p-8">
            <LogoMark className="h-10 w-10" />
            <h2 className="mt-4 text-2xl font-semibold">Hi! What would you like to know?</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-3">I can look things up across everyone's profile. I won't diagnose or change medicines — for that, please talk to your doctor.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-2xl border border-line bg-paper/60 px-4 py-3 text-left text-sm font-medium transition-colors hover:border-ink-4 hover:bg-surface">{s}</button>
              ))}
            </div>
            {!config.ai && <p className="mt-5 text-xs text-ink-3">AI answers aren't enabled on this server, so replies come straight from your saved records.</p>}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={clsx('flex gap-3', m.role === 'user' && 'justify-end')}>
            {m.role === 'assistant' && <LogoMark className="mt-1 h-8 w-8 shrink-0" />}
            <div className={clsx('max-w-[85%] rounded-3xl px-5 py-3.5 text-[15px] leading-relaxed sm:max-w-[75%]',
              m.role === 'user' ? 'rounded-br-lg bg-ink text-white' : m.mode === 'safety' ? 'rounded-bl-lg border border-bad/30 bg-bad-soft' : m.mode === 'error' ? 'rounded-bl-lg bg-bad-soft text-bad' : 'card rounded-bl-lg')}>
              {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
              {m.role === 'assistant' && MODE[m.mode] && (
                <div className="mt-3"><Badge tone={MODE[m.mode].tone}>{(() => { const I = MODE[m.mode].icon; return <I className="h-3 w-3" />; })()}{MODE[m.mode].label}</Badge></div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-3"><LogoMark className="h-8 w-8" /><span className="card flex items-center gap-2 rounded-3xl px-5 py-3 text-sm text-ink-3"><Spinner /> Looking through the records…</span></div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-20 lg:bottom-6">
        <div className="flex items-end gap-2 rounded-[28px] border border-line bg-surface p-2 pl-5 shadow-pop focus-within:border-ink">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Ask about medicines, readings, appointments…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-ink-4" />
          <Button type="submit" size="icon" className="h-11 w-11" disabled={!input.trim() || busy} aria-label="Send"><LuSend className="h-4 w-4" /></Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-4">Not medical advice. In an emergency call 112.</p>
      </form>
    </div>
  );
}
