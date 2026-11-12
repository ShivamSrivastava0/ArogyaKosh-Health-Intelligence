import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import clsx from 'clsx';
import { LuSearch, LuCornerDownLeft, LuPlus } from 'react-icons/lu';
import { ALL_NAV } from './nav';
import { useFamily } from '../../context/FamilyContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Avatar } from '../ui/Display';

/** ⌘K / Ctrl+K: jump to any page, member, or start an "add" flow. */
export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { members } = useFamily();
  const quick = useQuickAdd();

  const items = useMemo(() => {
    const all = [
      ...ALL_NAV.map((n) => ({ id: n.to, label: n.label, hint: 'Page', icon: n.icon, run: () => navigate(n.to) })),
      ...members.map((m) => ({ id: m._id, label: m.name, hint: 'Family', avatar: m, run: () => navigate(`/app/family/${m._id}`) })),
      ...[['medicine', 'Add a medicine'], ['vital', 'Log a reading (BP, sugar…)'], ['record', 'Upload a report'], ['reminder', 'Add an appointment'], ['expense', 'Add an expense'], ['member', 'Add a family member']]
        .map(([k, label]) => ({ id: `add-${k}`, label, hint: 'Action', icon: LuPlus, run: () => quick.open(k) })),
    ];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s)) : all;
  }, [q, members, navigate, quick]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const go = (item) => { onClose(); item?.run(); };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" />
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]">
        <DialogPanel className="w-full max-w-lg animate-fade-up overflow-hidden rounded-3xl bg-surface shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-5">
            <LuSearch className="h-4 w-4 text-ink-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages, family, actions…"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-4"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') go(items[active]);
              }} />
            <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-2xs text-ink-3">esc</kbd>
          </div>
          <ul className="max-h-[50vh] overflow-y-auto p-2">
            {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">No matches</li>}
            {items.map((item, i) => (
              <li key={item.id}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(item)}
                  className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === active ? 'bg-paper' : '')}>
                  {item.avatar ? <Avatar name={item.avatar.name} color={item.avatar.color} size="xs" /> : <item.icon className="h-4 w-4 text-ink-3" />}
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-2xs text-ink-4">{item.hint}</span>
                  {i === active && <LuCornerDownLeft className="h-3.5 w-3.5 text-ink-3" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
