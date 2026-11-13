import { Link } from 'react-router-dom';
import { LuPlus, LuDroplet, LuPill, LuTriangleAlert, LuChevronRight, LuBrainCircuit } from 'react-icons/lu';
import { useApi } from '../../hooks/useApi';
import { useQuickAdd } from '../../context/QuickAddContext';
import { PageHeader, Avatar, ScoreRing, Badge, Skeleton } from '../../components/ui/Display';
import Button from '../../components/ui/Button';
import { RELATIONS } from '../../lib/constants';

export default function Family() {
  const quick = useQuickAdd();
  const { data, loading } = useApi('/members', { withScores: 1 });
  const { data: pred } = useApi('/predict');
  const radar = new Map((pred?.members || []).map((r) => [r.member._id, r]));
  const members = data?.items || [];

  return (
    <div>
      <PageHeader title="Family" subtitle="One profile per person — with heart age, risk forecasts and a health score that explains itself."
        actions={<Button icon={LuPlus} onClick={() => quick.open('member')}>Add member</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}
        {members.map((m) => {
          const severe = m.allergies?.filter((a) => a.severity === 'SEVERE') || [];
          const active = m.conditions?.filter((c) => c.status !== 'RESOLVED') || [];
          return (
            <Link key={m._id} to={`/app/family/${m._id}`} className="card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-ink-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.color} size="lg" />
                  <div>
                    <p className="font-display text-lg font-semibold leading-tight">{m.name}</p>
                    <p className="mt-0.5 text-[13px] text-ink-3">{RELATIONS[m.relation]}{m.age !== null ? ` · ${m.age < 1 ? 'under 1' : `${m.age} yr${m.age === 1 ? '' : 's'}`}` : ''}</p>
                  </div>
                </div>
                <ScoreRing value={m.score?.score} size={52} stroke={5} />
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                <Badge tone={m.bloodGroup ? 'neutral' : 'warn'}><LuDroplet className="h-3 w-3" />{m.bloodGroup || 'Blood group?'}</Badge>
                <Badge><LuPill className="h-3 w-3" />{m.activeMedicines} medicine{m.activeMedicines === 1 ? '' : 's'}</Badge>
                {severe.map((a) => <Badge key={a._id} tone="bad"><LuTriangleAlert className="h-3 w-3" />{a.name}</Badge>)}
              </div>
              <p className="mt-3 line-clamp-1 text-[13px] text-ink-3">{active.length ? active.map((c) => c.name).join(', ') : 'No long-term conditions recorded'}</p>
              {(() => {
                const r = radar.get(m._id);
                if (!r?.cardio) return null;
                const tone = { LOW: 'text-ok', MODERATE: 'text-warn', HIGH: 'text-bad' }[r.cardio.band];
                return (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px]">
                    <LuBrainCircuit className="h-4 w-4 text-brand" />
                    <span>Heart age <b className="tnum">{r.cardio.heartAge >= 80 ? '80+' : r.cardio.heartAge}</b></span>
                    <span className="text-ink-4">·</span>
                    <span className={tone}>10-yr risk <b className="tnum">{r.cardio.risk}%</b></span>
                  </div>
                );
              })()}
              <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-4 text-[13px]">
                <span className="text-ink-3">{m.score?.score !== null && m.score?.score !== undefined ? `Health score · ${m.score.grade}` : 'Add details to get a health score'}</span>
                <LuChevronRight className="h-4 w-4 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </Link>
          );
        })}
        {!loading && (
          <button type="button" onClick={() => quick.open('member')} className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line p-6 text-center transition-colors hover:border-ink-4 hover:bg-surface">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-lime"><LuPlus className="h-5 w-5" /></span>
            <span className="font-semibold">Add a family member</span>
            <span className="max-w-[16rem] text-[13px] text-ink-3">Parents, kids, spouse, in-laws — anyone whose health you help manage.</span>
          </button>
        )}
      </div>
    </div>
  );
}
