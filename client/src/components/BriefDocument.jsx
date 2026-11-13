import clsx from 'clsx';
import { LuTriangleAlert, LuPaperclip } from 'react-icons/lu';
import { StatusBadge, TrendIcon, Badge } from './ui/Display';
import { GENDERS, SEVERITIES, CONDITION_STATUS, LIFESTYLE, RECORD_CATEGORIES, REMINDER_TYPES } from '../lib/constants';
import { fmtDate, fmtDateTime } from '../lib/format';

const Section = ({ title, children, className }) => (
  <section className={clsx('break-inside-avoid', className)}>
    <h3 className="mb-2.5 border-b border-line pb-1.5 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h3>
    {children}
  </section>
);

/** The one-page clinical summary. fileUrl(record) returns a link for attachments (share page only). */
export default function BriefDocument({ brief, fileUrl }) {
  const p = brief.patient;
  const ls = brief.lifestyle || {};
  return (
    <article className="print-plain card space-y-7 p-6 sm:p-9">
      <header className="flex flex-col justify-between gap-4 border-b-2 border-ink pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Patient summary</p>
          <h2 className="mt-1 text-3xl font-semibold">{p.name}</h2>
          <p className="mt-1 text-sm text-ink-2">
            {[p.age !== null && `${p.age} yrs`, GENDERS[p.gender], p.bloodGroup && `Blood ${p.bloodGroup}`, p.heightCm && `${p.heightCm} cm`, p.weightKg && `${p.weightKg} kg`, p.bmi && `BMI ${p.bmi}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="text-xs text-ink-3">Generated {fmtDateTime(brief.generatedAt)}<br />via ArogyaKosh · patient-reported records</p>
      </header>

      {brief.flags.length > 0 && (
        <div className="rounded-2xl border border-bad/25 bg-bad-soft/60 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-bad"><LuTriangleAlert className="h-4 w-4" />Key flags</p>
          <ul className="space-y-1 text-sm text-ink">{brief.flags.map((f) => <li key={f}>• {f}</li>)}</ul>
        </div>
      )}

      {brief.aiSummary && (
        <Section title="Summary">
          <div className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{brief.aiSummary}</div>
          <p className="mt-2 text-[11px] text-ink-4">AI-written from the records below. Verify against source documents.</p>
        </Section>
      )}

      <div className="grid gap-7 md:grid-cols-2">
        <Section title="Allergies">
          {brief.allergies.length ? (
            <ul className="space-y-1.5 text-sm">{brief.allergies.map((a) => <li key={a._id || a.name}><b>{a.name}</b> — {SEVERITIES[a.severity]}{a.reaction ? ` (${a.reaction})` : ''}</li>)}</ul>
          ) : <p className="text-sm text-ink-3">{brief.noKnownAllergies ? 'No known allergies' : 'Not recorded'}</p>}
        </Section>
        <Section title="Conditions">
          {brief.conditions.length ? (
            <ul className="space-y-1.5 text-sm">{brief.conditions.map((c) => <li key={c._id || c.name}><b>{c.name}</b> — {CONDITION_STATUS[c.status]}{c.since ? `, since ${new Date(c.since).getFullYear()}` : ''}</li>)}</ul>
          ) : <p className="text-sm text-ink-3">None recorded</p>}
        </Section>
      </div>

      {brief.outlook && (brief.outlook.cardio || brief.outlook.trends?.length > 0 || brief.outlook.kidney || brief.outlook.glycaemic) && (
        <Section title="Predicted outlook · ArogyaPredict">
          <div className="grid gap-3 sm:grid-cols-3">
            {brief.outlook.cardio && (
              <div className="rounded-2xl bg-paper p-3 text-sm">
                <p className="text-xs text-ink-3">10-yr CVD risk (Framingham)</p>
                <p className="tnum font-display text-xl font-semibold">{brief.outlook.cardio.risk}% <span className="font-sans text-xs font-normal text-ink-3">· heart age {brief.outlook.cardio.heartAge >= 80 ? '80+' : brief.outlook.cardio.heartAge}</span></p>
              </div>
            )}
            {brief.outlook.kidney && (
              <div className="rounded-2xl bg-paper p-3 text-sm"><p className="text-xs text-ink-3">eGFR (CKD-EPI 2021)</p><p className="tnum font-display text-xl font-semibold">{brief.outlook.kidney.egfr} <span className="font-sans text-xs font-normal text-ink-3">· {brief.outlook.kidney.stage}</span></p></div>
            )}
            {brief.outlook.glycaemic && (
              <div className="rounded-2xl bg-paper p-3 text-sm"><p className="text-xs text-ink-3">Glycaemic status</p><p className="font-semibold">{brief.outlook.glycaemic.label}</p></div>
            )}
          </div>
          {brief.outlook.trends?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {brief.outlook.trends.map((t) => (
                <li key={t.label}><b>{t.label}</b> — {t.direction.toLowerCase()} {t.changePerMonth > 0 ? '+' : ''}{t.changePerMonth} {t.unit}/month ({t.confidence.toLowerCase()} confidence){t.crossing ? `; projected ${t.crossing.status.toLowerCase()} by ${fmtDate(t.crossing.date)}` : ''}</li>
              ))}
            </ul>
          )}
          {brief.outlook.patterns?.length > 0 && <p className="mt-2 text-sm text-ink-2"><b>Adherence pattern:</b> {brief.outlook.patterns.map((p) => `${p.medicine} at ${p.time} missed ${p.missRate}%`).join('; ')}</p>}
        </Section>
      )}

      <Section title={`Current medicines${brief.adherence !== null && brief.adherence !== undefined ? ` · ${brief.adherence}% adherence (30 days)` : ''}`}>
        {brief.medicines.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-2xs uppercase tracking-wider text-ink-3"><tr><th className="py-1.5 font-semibold">Medicine</th><th className="py-1.5 font-semibold">How</th><th className="hidden py-1.5 font-semibold sm:table-cell">For</th><th className="py-1.5 text-right font-semibold">Taken</th></tr></thead>
            <tbody className="divide-y divide-line-soft">
              {brief.medicines.map((m) => (
                <tr key={m._id}>
                  <td className="py-2 pr-3 font-semibold">{m.name}{m.prescribedBy && <span className="block text-xs font-normal text-ink-3">{m.prescribedBy}</span>}</td>
                  <td className="py-2 pr-3 text-ink-2">{m.schedule}</td>
                  <td className="hidden py-2 pr-3 text-ink-3 sm:table-cell">{m.reason}</td>
                  <td className="tnum py-2 text-right">{m.adherence !== null ? `${m.adherence}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-ink-3">No current medicines</p>}
      </Section>

      <Section title="Latest readings">
        {brief.vitals.length ? (
          <div className="grid gap-x-8 sm:grid-cols-2">
            {brief.vitals.map((v) => (
              <div key={v.type} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 text-sm">
                <span className="text-ink-2">{v.label}<span className="block text-[11px] text-ink-4">{fmtDate(v.at)} · normal {v.normal}</span></span>
                <span className="flex items-center gap-2 text-right">
                  <span className="tnum font-semibold">{v.value}</span>
                  {v.previous && <span className="flex items-center gap-0.5 text-[11px] text-ink-3"><TrendIcon trend={v.trend} className="h-3 w-3" />{v.previous}</span>}
                  <StatusBadge status={v.status} />
                </span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-ink-3">No readings logged</p>}
      </Section>

      <div className="grid gap-7 md:grid-cols-2">
        <Section title="Recent visits & tests">
          {brief.recentVisits.length ? (
            <ul className="space-y-2 text-sm">{brief.recentVisits.map((v, i) => <li key={i}><b>{fmtDate(v.date)}</b> — {v.title}{v.doctor ? `, ${v.doctor}` : ''}<span className="text-ink-3"> ({REMINDER_TYPES[v.type]})</span></li>)}</ul>
          ) : <p className="text-sm text-ink-3">None in the last 6 months</p>}
        </Section>
        <Section title="Vaccinations">
          {brief.vaccinations.pending.length > 0 && <p className="mb-1.5 text-sm"><span className="font-semibold text-warn">Pending:</span> {brief.vaccinations.pending.map((v) => `${v.name} (${v.dose})`).join(', ')}</p>}
          {brief.vaccinations.given.length > 0 && <p className="text-sm text-ink-2"><span className="font-semibold">Recent:</span> {brief.vaccinations.given.map((v) => `${v.name} ${fmtDate(v.date)}`).join(', ')}</p>}
          {!brief.vaccinations.pending.length && !brief.vaccinations.given.length && <p className="text-sm text-ink-3">Not recorded</p>}
        </Section>
      </div>

      <Section title="Records">
        {brief.records.length ? (
          <ul className="divide-y divide-line-soft text-sm">
            {brief.records.map((r) => (
              <li key={r._id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><b>{r.title}</b> <span className="text-ink-3">· {RECORD_CATEGORIES[r.category]} · {fmtDate(r.date)}{r.facility ? ` · ${r.facility}` : ''}</span></span>
                  {r.hasFile && fileUrl && <a href={fileUrl(r)} target="_blank" rel="noreferrer" className="no-print inline-flex items-center gap-1 text-[13px] font-semibold underline underline-offset-4"><LuPaperclip className="h-3.5 w-3.5" />Open</a>}
                </div>
                {r.summary && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.summary}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-3">No records shared</p>}
      </Section>

      <div className="grid gap-7 md:grid-cols-2">
        <Section title="Lifestyle">
          <p className="text-sm text-ink-2">{['smoking', 'alcohol', 'activity', 'diet'].map((k) => ls[k] && `${k[0].toUpperCase() + k.slice(1)}: ${LIFESTYLE[k][ls[k]]}`).filter(Boolean).join(' · ') || 'Not recorded'}{ls.sleepHours ? ` · Sleep ${ls.sleepHours} h` : ''}</p>
        </Section>
        {brief.safety?.length > 0 && (
          <Section title="Interaction flags">
            <ul className="space-y-1 text-sm">{brief.safety.map((s) => <li key={s.title + s.effect}><Badge tone={s.severity === 'HIGH' ? 'bad' : 'warn'} className="mr-1.5">{s.severity.toLowerCase()}</Badge>{s.title}</li>)}</ul>
          </Section>
        )}
      </div>
      {brief.notes && <Section title="Notes"><p className="whitespace-pre-wrap text-sm text-ink-2">{brief.notes}</p></Section>}
    </article>
  );
}
