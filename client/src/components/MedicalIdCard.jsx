import { useRef, useState } from 'react';
import clsx from 'clsx';
import QRCode from 'react-qr-code';
import { GENDERS } from '../lib/constants';

/**
 * A real-proportion (ISO/IEC 7810 ID-1, 85.6 × 53.98 mm) medical ID card.
 * Front: identity, blood group, QR. Back: allergies, conditions, medicines,
 * contacts. Sizes use container-query units so the same markup renders on
 * screen at any width and prints at exact wallet size.
 */

const fmtDob = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const cardId = (token = '') => token.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().replace(/(.{4})/, '$1 ');

/** Fine line "guilloche" pattern like on banknotes and ID cards. */
function Guilloche({ className, stroke = 'rgba(255,255,255,0.10)' }) {
  const paths = Array.from({ length: 14 }, (_, i) => {
    const a = 14 + i * 3;
    const y = 30 + i * 1.6;
    return `M-10 ${y} C 40 ${y - a}, 90 ${y + a}, 140 ${y} S 240 ${y - a}, 290 ${y}`;
  });
  return (
    <svg viewBox="0 0 280 176" preserveAspectRatio="none" className={className} aria-hidden>
      {paths.map((d) => <path key={d} d={d} fill="none" stroke={stroke} strokeWidth="0.6" />)}
      {paths.map((d, i) => <path key={`b${d}`} d={d} transform={`translate(0 ${70 + i}) scale(1 -1) translate(0 -${110 + i})`} fill="none" stroke={stroke} strokeWidth="0.5" />)}
    </svg>
  );
}

const Cross = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="currentColor" />
  </svg>
);

export function CardFront({ member, url }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[4.6cqw] text-white [backface-visibility:hidden]"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, #E2363F 0%, #B5121F 45%, #7A0A14 100%)' }}>
      <Guilloche className="absolute inset-0 h-full w-full" />
      <div className="absolute -right-[12cqw] -top-[18cqw] h-[55cqw] w-[55cqw] rounded-full bg-white/10" />
      {/* holographic security strip */}
      <div className="holo absolute right-[5cqw] top-[5cqw] h-[8.5cqw] w-[13cqw] rounded-[1.6cqw] opacity-80 shadow-[inset_0_0_0_1px_rgba(255,255,255,.5)]"><Cross className="absolute inset-0 m-auto h-[5cqw] w-[5cqw] text-white/50" /></div>

      <div className="relative flex h-full flex-col p-[5cqw]">
        <div className="flex items-center gap-[2cqw]">
          <span className="grid h-[7cqw] w-[7cqw] place-items-center rounded-[1.6cqw] bg-white text-[#C8102E]"><Cross className="h-[4.6cqw] w-[4.6cqw]" /></span>
          <div className="leading-tight">
            <p className="text-[3.4cqw] font-extrabold tracking-[0.18em]">MEDICAL ID</p>
            <p className="text-[2.8cqw] font-medium text-white/75">Emergency information card</p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-[3cqw]">
          <div className="min-w-0">
            <p className="text-[3cqw] font-semibold uppercase tracking-[0.14em] text-white/70">Name</p>
            <p className="truncate font-display text-[6.4cqw] font-bold leading-[1.05]">{member.name}</p>
            <div className="mt-[2cqw] flex gap-[4cqw] text-[3cqw]">
              <div><p className="text-[2.5cqw] uppercase tracking-[0.12em] text-white/65">Born</p><p className="font-semibold">{fmtDob(member.dob)}</p></div>
              <div><p className="text-[2.5cqw] uppercase tracking-[0.12em] text-white/65">Sex</p><p className="font-semibold">{GENDERS[member.gender] || '—'}</p></div>
              <div><p className="text-[2.5cqw] uppercase tracking-[0.12em] text-white/65">Blood</p><p className="font-display text-[5cqw] font-bold leading-none">{member.bloodGroup || '?'}</p></div>
            </div>
          </div>
          <div className="shrink-0 rounded-[2.4cqw] bg-white p-[1.6cqw] shadow-[0_4px_14px_rgba(0,0,0,.25)]">
            <QRCode value={url} size={256} level="M" fgColor="#0B2239" style={{ width: '20cqw', height: '20cqw', display: 'block' }} />
          </div>
        </div>

        <div className="mt-[3cqw] flex items-center justify-between border-t border-white/20 pt-[2cqw] text-[2.8cqw]">
          <span className="font-semibold">Scan for allergies, medicines & contacts</span>
          <span className="font-bold tracking-wide">108 · 112</span>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, children, tone }) => (
  <div className="flex gap-[2cqw] border-b border-[#EDE3E3] py-[1.1cqw] last:border-0">
    <span className="w-[17cqw] shrink-0 text-[2.5cqw] font-bold uppercase tracking-[0.1em] text-[#9B6B6E]">{label}</span>
    <span className={clsx('min-w-0 flex-1 text-[3cqw] font-semibold leading-snug', tone)}>{children}</span>
  </div>
);

export function CardBack({ member, flat }) {
  const allergies = member.allergies?.map((a) => `${a.name}${a.severity === 'SEVERE' ? ' (severe)' : ''}`).join(', ');
  const conditions = member.conditions?.filter((c) => c.status !== 'RESOLVED').map((c) => c.name).join(', ');
  const contacts = member.emergencyContacts?.slice(0, 2) || [];
  return (
    <div className={clsx('absolute inset-0 overflow-hidden rounded-[4.6cqw] bg-[#FFFCFB] text-[#2A1517]', !flat && '[backface-visibility:hidden] [transform:rotateY(180deg)]')}>
      <Guilloche className="absolute inset-0 h-full w-full" stroke="rgba(200,16,46,0.06)" />
      <div className="relative h-[9cqw] bg-[#B5121F]">
        <div className="flex h-full items-center justify-between px-[5cqw] text-white">
          <span className="text-[3cqw] font-extrabold tracking-[0.18em]">IN CASE OF EMERGENCY</span>
          <span className="text-[2.8cqw] font-semibold">{member.organDonor ? 'ORGAN DONOR ♥' : ''}</span>
        </div>
      </div>
      <div className="relative px-[5cqw] pt-[1.5cqw]">
        <Row label="Allergies" tone={member.allergies?.length ? 'text-[#B5121F]' : ''}>{allergies || (member.noKnownAllergies ? 'No known allergies' : 'Not recorded')}</Row>
        <Row label="Conditions">{conditions || 'None recorded'}</Row>
        <Row label="Contacts">
          {contacts.length ? contacts.map((c) => <span key={c.phone} className="block">{c.name}{c.relation ? ` (${c.relation})` : ''} · {c.phone}</span>) : 'Not recorded'}
        </Row>
        {member.doctor?.name && <Row label="Doctor">{member.doctor.name}{member.doctor.phone ? ` · ${member.doctor.phone}` : ''}</Row>}
      </div>
      <div className="absolute inset-x-[5cqw] bottom-[3cqw] flex items-end justify-between text-[2.5cqw] text-[#9B6B6E]">
        <span>Current medicines & full details: scan the QR on the front.<br />Card ID {cardId(member.emergencyToken)}</span>
        <span className="font-display text-[2.8cqw] font-bold text-[#2A1517]">arogya<span className="rounded bg-[#2DD4BF] px-[0.6cqw] text-[#0B2239]">kosh</span></span>
      </div>
    </div>
  );
}

/** Interactive card: 3D tilt + moving glare on hover, flips on click / Enter. */
export default function MedicalIdCard({ member, url, disabled }) {
  const ref = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 50, active: false });
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: (0.5 - py) * 14, y: (px - 0.5) * 18, gx: px * 100, gy: py * 100, active: true });
  };
  const reset = () => setTilt({ x: 0, y: 0, gx: 50, gy: 50, active: false });

  return (
    <div className="card-in [perspective:1100px]">
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`${member.name}'s medical ID card. Press to flip.`}
        onMouseMove={onMove}
        onMouseLeave={reset}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); } }}
        className={clsx('relative aspect-[85.6/53.98] w-full cursor-pointer select-none [container-type:inline-size] [transform-style:preserve-3d]',
          tilt.active ? 'transition-transform duration-100' : 'transition-transform duration-700 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]',
          disabled && 'opacity-40 grayscale')}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${(flipped ? 180 : 0) + tilt.y}deg) ${tilt.active ? 'translateZ(12px)' : ''}` }}
      >
        <div className={clsx('absolute inset-0 rounded-[4.6cqw] transition-shadow duration-300', tilt.active ? 'shadow-[0_28px_50px_-18px_rgba(122,10,20,.55)]' : 'shadow-[0_14px_30px_-14px_rgba(122,10,20,.45)]')} />
        <CardFront member={member} url={url} />
        <CardBack member={member} />
        {/* glare follows the pointer */}
        <div className="pointer-events-none absolute inset-0 rounded-[4.6cqw] mix-blend-soft-light transition-opacity duration-300 [backface-visibility:hidden]"
          style={{ opacity: tilt.active ? 1 : 0, background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.75), transparent 45%)` }} />
        <div className="shine pointer-events-none absolute inset-0 overflow-hidden rounded-[4.6cqw] [backface-visibility:hidden]" />
      </div>
    </div>
  );
}

/** Print layout: front and back side by side at true size, with a fold line. */
export function PrintableCard({ member, url }) {
  return (
    <div className="print-card-sheet">
      <p className="mb-3 text-[11px] text-ink-3">Print at 100% scale (not "fit to page"). Cut around the outline, fold on the dashed line, and laminate.</p>
      <div className="flex items-center">
        <div className="relative [container-type:inline-size]" style={{ width: '85.6mm', height: '53.98mm' }}><CardFront member={member} url={url} /></div>
        <div className="mx-0 h-[53.98mm] border-l border-dashed border-ink-4" />
        <div className="relative [container-type:inline-size]" style={{ width: '85.6mm', height: '53.98mm' }}><CardBack member={member} flat /></div>
      </div>
    </div>
  );
}
