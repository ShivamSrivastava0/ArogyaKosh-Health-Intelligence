import { createContext, useCallback, useContext, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import { LuX, LuEllipsis } from 'react-icons/lu';
import Button from './Button';

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" aria-hidden />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel className={clsx('flex max-h-[92dvh] w-full animate-fade-up flex-col rounded-t-3xl bg-surface shadow-pop sm:rounded-3xl', widths[size])}>
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
            <div>
              <DialogTitle className="font-display text-xl font-semibold">{title}</DialogTitle>
              {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><LuX className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-6 py-4">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function Drawer({ open, onClose, title, description, children, footer, width = 'max-w-xl' }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" aria-hidden />
      <div className="fixed inset-y-0 right-0 flex w-full justify-end">
        <DialogPanel className={clsx('flex h-full w-full flex-col bg-surface shadow-pop', width)} style={{ animation: 'slide-in .25s cubic-bezier(.2,.8,.2,1)' }}>
          <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
            <div>
              <DialogTitle className="font-display text-xl font-semibold">{title}</DialogTitle>
              {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><LuX className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-line-soft px-6 py-4">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** Kebab / action menu. items: [{ label, icon, onClick, danger, hidden }] */
export function ActionMenu({ items, label = 'More actions', align = 'end', button }) {
  return (
    <Menu>
      {button ? <MenuButton as="div">{button}</MenuButton> : (
        <MenuButton className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink" aria-label={label}>
          <LuEllipsis className="h-4 w-4" />
        </MenuButton>
      )}
      <MenuItems anchor={{ to: `bottom ${align}`, gap: 6 }} className="z-50 min-w-[11rem] rounded-2xl border border-line bg-surface p-1.5 shadow-pop focus:outline-none">
        {items.filter((i) => !i.hidden).map((i) => (
          <MenuItem key={i.label}>
            <button type="button" onClick={i.onClick}
              className={clsx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm data-[focus]:bg-paper', i.danger ? 'text-bad' : 'text-ink-2')}>
              {i.icon && <i.icon className="h-4 w-4" />}{i.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

const ConfirmCtx = createContext(null);

/** const confirm = useConfirm(); if (await confirm({ title, body, danger })) ... */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title || 'Are you sure?'} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{state?.confirmLabel || 'Confirm'}</Button>
        </>}>
        <p className="text-sm leading-relaxed text-ink-2">{state?.body}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
