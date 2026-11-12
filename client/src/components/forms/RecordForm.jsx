import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { LuUpload, LuFileText, LuX } from 'react-icons/lu';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import { Input, Select, TagInput, Textarea } from '../ui/Field';
import { ProgressBar } from '../ui/Display';
import { MemberPicker, useForm } from './common';
import { api } from '../../api/client';
import { invalidate } from '../../hooks/useApi';
import { RECORD_CATEGORIES } from '../../lib/constants';
import { bytes, toInputDate, todayKey } from '../../lib/format';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const guessCategory = (name = '') => {
  const n = name.toLowerCase();
  if (/(rx|prescri)/.test(n)) return 'PRESCRIPTION';
  if (/(lab|report|cbc|lipid|thyroid|test|blood)/.test(n)) return 'LAB_REPORT';
  if (/(xray|x-ray|mri|ct|scan|usg|ultra|ecg)/.test(n)) return 'IMAGING';
  if (/(bill|invoice|receipt)/.test(n)) return 'BILL';
  if (/(policy|insur)/.test(n)) return 'INSURANCE';
  if (/(discharge)/.test(n)) return 'DISCHARGE_SUMMARY';
  if (/(vacc)/.test(n)) return 'VACCINATION';
  return 'OTHER';
};

export default function RecordForm({ open, onClose, record, defaultMember, onSaved }) {
  const editing = Boolean(record?._id);
  const init = () => (record
    ? { ...record, member: record.member?._id || record.member, date: toInputDate(record.date), tags: record.tags || [] }
    : { member: defaultMember || '', title: '', category: 'LAB_REPORT', date: todayKey(), doctor: '', facility: '', tags: [], notes: '' });
  const { values: v, set, setValues, errors, saving, submit } = useForm(init());
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setValues(init()); setFile(null); setProgress(0); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (f) => {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return;
    setFile(f);
    setValues((s) => ({
      ...s,
      title: s.title || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80),
      category: s.title ? s.category : guessCategory(f.name),
    }));
  };

  const save = () => submit(async (s) => {
    let saved;
    if (editing) {
      saved = await api.patch(`/records/${record._id}`, { member: s.member, title: s.title, category: s.category, date: s.date, doctor: s.doctor, facility: s.facility, tags: s.tags, notes: s.notes });
    } else {
      const fd = new FormData();
      ['member', 'title', 'category', 'date', 'doctor', 'facility', 'notes'].forEach((k) => s[k] && fd.append(k, s[k]));
      fd.append('tags', s.tags.join(','));
      if (file) fd.append('file', file);
      saved = await api.upload('/records', fd, setProgress);
    }
    await invalidate('/records', '/today', '/scores');
    onSaved?.(saved.record);
    onClose();
  }, {
    success: editing ? 'Record updated' : 'Saved to the locker',
    validate: (s) => ({ ...(!s.member && { member: 'Choose a family member' }), ...(!s.title.trim() && { title: 'Give it a title' }) }),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit record' : 'Add to health locker'} description={editing ? undefined : 'PDFs and photos up to 15 MB. Stored privately — only you can open them.'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>{editing ? 'Save' : 'Upload'}</Button></>}>
      <div className="space-y-5">
        {!editing && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            className={clsx('rounded-3xl border-2 border-dashed p-6 text-center transition-colors', drag ? 'border-ink bg-lime-soft' : 'border-line bg-paper/60')}>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {file ? (
              <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper"><LuFileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-ink-3">{bytes(file.size)}</p>
                  {saving && <ProgressBar value={progress} className="mt-2" tone="lime" />}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Remove file"><LuX className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface shadow-card"><LuUpload className="h-5 w-5" /></span>
                <p className="text-sm font-medium">Drop a file here, or <button type="button" className="link" onClick={() => inputRef.current?.click()}>browse</button></p>
                <p className="mt-1 text-xs text-ink-3">On your phone you can take a photo of a paper report.</p>
              </>
            )}
          </div>
        )}

        <MemberPicker value={v.member} onChange={set('member')} label="Whose record?" error={errors.member} />
        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <Input label="Title" placeholder="Lipid profile, Prescription — Dr. Rao…" value={v.title} onChange={set('title')} error={errors.title} />
          <Select label="Type" value={v.category} onChange={set('category')} options={RECORD_CATEGORIES} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Date" type="date" value={v.date} onChange={set('date')} />
          <Input label="Doctor" optional value={v.doctor} onChange={set('doctor')} />
          <Input label="Hospital / lab" optional value={v.facility} onChange={set('facility')} />
        </div>
        <TagInput label="Tags" value={v.tags} onChange={set('tags')} placeholder="diabetes, annual… press Enter" />
        <Textarea label="Notes" optional rows={2} value={v.notes} onChange={set('notes')} />
      </div>
    </Modal>
  );
}
