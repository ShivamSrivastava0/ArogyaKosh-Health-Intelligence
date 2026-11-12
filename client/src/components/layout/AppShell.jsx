import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { Dialog, DialogPanel } from '@headlessui/react';
import { LuPlus, LuSearch, LuMenu, LuLogOut, LuX, LuPill, LuActivity, LuUpload, LuCalendarPlus, LuWallet, LuUserPlus } from 'react-icons/lu';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import { Avatar } from '../ui/Display';
import { ActionMenu } from '../ui/Overlay';
import CommandPalette from './CommandPalette';
import { NAV, SETTINGS, ALL_NAV, MOBILE_TABS } from './nav';
import { useAuth } from '../../context/AuthContext';
import { useQuickAdd } from '../../context/QuickAddContext';

function NavItem({ item, onClick }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onClick}
      className={({ isActive }) => clsx('group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
        isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/5 hover:text-ink')}>
      {({ isActive }) => (
        <>
          <item.icon className={clsx('h-[18px] w-[18px]', isActive ? 'text-lime' : 'text-ink-3 group-hover:text-ink')} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function SidebarBody({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <Link to="/app" onClick={onNavigate} className="px-3 pb-6 pt-1"><Logo size="sm" /></Link>
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="eyebrow mb-1.5 px-3">{g.group}</p>
            <div className="space-y-0.5">{g.items.map((i) => <NavItem key={i.to} item={i} onClick={onNavigate} />)}</div>
          </div>
        ))}
      </nav>
      <div className="mt-4 space-y-0.5 border-t border-line pt-4">
        <NavItem item={SETTINGS} onClick={onNavigate} />
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <Avatar name={user?.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-ink-3">{user?.isDemo ? 'Demo household' : user?.email}</p>
          </div>
          <button type="button" onClick={async () => { await logout(); navigate('/'); }} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink" aria-label="Sign out">
            <LuLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const { user } = useAuth();
  const quick = useQuickAdd();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const addItems = [
    { label: 'Medicine', icon: LuPill, onClick: () => quick.open('medicine') },
    { label: 'Reading (BP, sugar…)', icon: LuActivity, onClick: () => quick.open('vital') },
    { label: 'Report or prescription', icon: LuUpload, onClick: () => quick.open('record') },
    { label: 'Appointment', icon: LuCalendarPlus, onClick: () => quick.open('reminder') },
    { label: 'Expense', icon: LuWallet, onClick: () => quick.open('expense') },
    { label: 'Family member', icon: LuUserPlus, onClick: () => quick.open('member') },
  ];

  return (
    <div className="min-h-dvh">
      {user?.isDemo && (
        <div className="no-print flex items-center justify-center gap-3 bg-ink px-4 py-2 text-center text-[13px] text-white">
          <span>You're exploring a sample household. Changes reset after 24 hours.</span>
          <Link to="/register" className="font-semibold text-lime underline underline-offset-4">Create your own →</Link>
        </div>
      )}

      <aside className="no-print fixed bottom-0 left-0 top-0 hidden w-[248px] border-r border-line bg-paper px-3 py-5 lg:block" style={user?.isDemo ? { top: 36 } : undefined}>
        <SidebarBody />
      </aside>

      <Dialog open={menu} onClose={setMenu} className="relative z-50 lg:hidden">
        <div className="fixed inset-0 bg-ink/30" />
        <DialogPanel className="fixed inset-y-0 left-0 w-[280px] animate-fade-in bg-paper px-3 py-5 shadow-pop">
          <button type="button" onClick={() => setMenu(false)} className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5" aria-label="Close menu"><LuX className="h-4 w-4" /></button>
          <SidebarBody onNavigate={() => setMenu(false)} />
        </DialogPanel>
      </Dialog>

      <div className="lg:pl-[248px]">
        <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 lg:hidden" aria-label="Open menu"><LuMenu className="h-5 w-5" /></button>
            <Link to="/app" className="lg:hidden"><Logo size="sm" mark={false} /></Link>
            <button type="button" onClick={() => setPalette(true)}
              className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-ink-3 transition-colors hover:border-ink-4 sm:flex lg:ml-0">
              <LuSearch className="h-4 w-4" /> Search or jump to…
              <kbd className="ml-auto rounded-md border border-line px-1.5 font-mono text-2xs">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => setPalette(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 sm:hidden" aria-label="Search"><LuSearch className="h-5 w-5" /></button>
              <ActionMenu items={addItems} button={<Button size="sm" icon={LuPlus}>Add</Button>} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((to) => ALL_NAV.find((n) => n.to === to)).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-ink' : 'text-ink-3')}>
              {({ isActive }) => (<>
                <span className={clsx('grid h-7 w-12 place-items-center rounded-full', isActive && 'bg-lime')}><item.icon className="h-[18px] w-[18px]" /></span>
                {item.short || item.label.split(' ')[0]}
              </>)}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMenu(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-3">
            <span className="grid h-7 w-12 place-items-center rounded-full"><LuMenu className="h-[18px] w-[18px]" /></span>More
          </button>
        </div>
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
