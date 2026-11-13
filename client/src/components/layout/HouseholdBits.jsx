import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Menu, MenuButton, MenuItem, MenuItems, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { LuChevronsUpDown, LuCheck, LuBell, LuCheckCheck, LuBellRing, LuTriangleAlert, LuHandHeart, LuInfo } from 'react-icons/lu';
import { useHousehold } from '../../context/HouseholdContext';
import { useApi, invalidate } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Avatar } from '../ui/Display';
import { relDays, fmtTime } from '../../lib/format';

const ROLE_LABEL = { OWNER: 'Your family', CAREGIVER: 'Caregiver', VIEWER: 'View only' };

/** Switch between your own family and families you help care for. */
export function HouseholdSwitcher() {
  const { households, current, switchTo } = useHousehold();
  if (households.length < 2) return null;
  return (
    <Menu>
      <MenuButton className="mb-5 flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-2.5 text-left hover:border-ink-4">
        <Avatar name={current.name} color={current.role === 'OWNER' ? 'lime' : 'sky'} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{current.name}</span>
          <span className="block text-2xs text-ink-3">{ROLE_LABEL[current.role]}{current.label ? ` · ${current.label}` : ''}</span>
        </span>
        <LuChevronsUpDown className="h-4 w-4 text-ink-3" />
      </MenuButton>
      <MenuItems anchor={{ to: 'bottom start', gap: 6 }} className="z-50 w-[232px] rounded-2xl border border-line bg-surface p-1.5 shadow-pop focus:outline-none">
        <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">Families you care for</p>
        {households.map((h) => (
          <MenuItem key={h._id}>
            <button type="button" onClick={() => switchTo(h._id)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left data-[focus]:bg-paper">
              <Avatar name={h.name} color={h.role === 'OWNER' ? 'lime' : 'sky'} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{h.name}</span>
                <span className="block text-2xs text-ink-3">{ROLE_LABEL[h.role]} · {h.members} member{h.members === 1 ? '' : 's'}</span>
              </span>
              {h._id === current._id && <LuCheck className="h-4 w-4 text-brand" />}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

const LEVEL = {
  critical: { icon: LuTriangleAlert, cls: 'bg-bad-soft text-bad' },
  warning: { icon: LuBellRing, cls: 'bg-warn-soft text-warn' },
  info: { icon: LuInfo, cls: 'bg-info-soft text-info' },
};

/** Alerts from every family you belong to (missed doses, critical readings, circle changes). */
export function NotificationBell() {
  const { data, reload } = useApi('/notifications');
  const { active, switchTo } = useHousehold();
  const navigate = useNavigate();
  useEffect(() => {
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);
  const unread = data?.unread || 0;
  const markAll = async () => { await api.post('/notifications/read', {}); invalidate('/notifications'); };
  const open = async (n, close) => {
    close();
    if (!n.read) api.post('/notifications/read', { ids: [n._id] }).then(() => invalidate('/notifications'));
    const ownerId = n.owner?._id || n.owner;
    if (ownerId && ownerId !== active) switchTo(ownerId);
    if (n.link) setTimeout(() => navigate(n.link), 0);
  };

  return (
    <Popover className="relative">
      <PopoverButton className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <LuBell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </PopoverButton>
      <PopoverPanel anchor={{ to: 'bottom end', gap: 8 }} className="z-50 w-[min(92vw,380px)] rounded-3xl border border-line bg-surface shadow-pop focus:outline-none">
        {({ close }) => (
          <>
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
              <p className="font-semibold">Alerts</p>
              {unread > 0 && <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"><LuCheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {!data?.items?.length && (
                <li className="flex flex-col items-center px-6 py-10 text-center">
                  <LuHandHeart className="h-6 w-6 text-ink-4" />
                  <p className="mt-2 text-sm font-medium">No alerts yet</p>
                  <p className="mt-1 text-xs text-ink-3">Missed doses and critical readings for anyone in your care circle will show up here.</p>
                </li>
              )}
              {data?.items?.map((n) => {
                const L = LEVEL[n.level] || LEVEL.info;
                return (
                  <li key={n._id}>
                    <button type="button" onClick={() => open(n, close)} className={clsx('flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left hover:bg-paper', !n.read && 'bg-brand-50/70')}>
                      <span className={clsx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', L.cls)}><L.icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{n.body}</span>}
                        <span className="mt-1 block text-2xs text-ink-4">{relDays(n.createdAt)}, {fmtTime(n.createdAt)}{n.owner?.name ? ` · ${n.owner.name.split(' ')[0]}'s family` : ''}</span>
                      </span>
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
