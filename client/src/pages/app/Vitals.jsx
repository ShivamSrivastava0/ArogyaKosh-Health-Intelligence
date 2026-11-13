import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LuPlus, LuActivity, LuTrash2 } from 'react-icons/lu';
import { useApi, invalidate } from '../../hooks/useApi';
import { api, errorMessage } from '../../api/client';
import { useFamily } from '../../context/FamilyContext';
import { useQuickAdd } from '../../context/QuickAddContext';
import { Card, PageHeader, Empty, StatusBadge, TrendIcon, Avatar, Skeleton, Badge } from '../../components/ui/Display';
import { Segmented } from '../../components/ui/Field';
import { useConfirm } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import { Trend } from '../../components/charts/Charts';
import { ForecastArt } from '../../components/illustrations';
import { fmtDateTime, fmtShort, relDays, firstName, shiftKey, todayKey } from '../../lib/format';

export const BANDS = {
  BP: [90, 120], HEART_RATE: [60, 100], SPO2: [95, 100], SUGAR_FASTING: [70, 99], SUGAR_PP: [70, 139], SUGAR_RANDOM: [70, 139],
  HBA1C: [4, 5.6], TEMPERATURE: [97, 99], CHOLESTEROL_TOTAL: [120, 199], LDL: [40, 99], HDL: [40, 90], TRIGLYCERIDES: [50, 149],
  HEMOGLOBIN: [12, 17.5], VITAMIN_D: [30, 100], VITAMIN_B12: [300, 900], TSH: [0.4, 4], CREATININE: [0.6, 1.3],
};

const show = (r, def) => (def?.dual ? `${r.value}/${r.value2}` : `${r.value}`);

/** Vitals for one member: latest cards + chart + readings. Reused on member profiles. */
export function VitalsPanel({ memberId, initialType }) {
  const quick = useQuickAdd();
  const confirm = useConfirm();
  const { data: catalog } = useApi('/vitals/types');
  const { data: latestData, loading: latestLoading } = useApi('/vitals/latest', { member: memberId });
  const latest = latestData?.items?.[memberId] || {};
  const types = catalog?.types || [];
  const withData = types.filter((t) => latest[t.type]);
  const [type, setType] = useState(initialType || '');
  const [range, setRange] = useState('90');

  useEffect(() => {
    if (!type || (!latest[type] && withData.length && !initialType)) setType(withData[0]?.type || 'BP');
  }, [memberId, withData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day precision keeps the query key stable across renders.
  const from = range === 'all' ? undefined : shiftKey(todayKey(), -Number(range));
  const { data, loading } = useApi(type ? '/vitals' : null, { member: memberId, type, from });
  const def = types.find((t) => t.type === type);
  const readings = data?.items || [];
  const chart = useMemo(() => [...readings].reverse().map((r) => ({ label: fmtShort(r.at), value: r.value, value2: r.value2 })), [readings]);

  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete this reading?', body: `${def?.label} ${show(r, def)} ${r.unit} on ${fmtDateTime(r.at)}`, danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/vitals/${r._id}`);
      await invalidate('/vitals', '/today', '/scores');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  if (latestLoading) return <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;

  if (!withData.length) {
    return (
      <Card>
        <Empty art={ForecastArt} title="No readings yet" body="Log BP, sugar, weight or lab values. ArogyaPredict charts them against normal ranges, learns the trend and forecasts where it's heading."
          action={<Button size="sm" icon={LuPlus} onClick={() => quick.open('vital', { member: memberId })}>Log first reading</Button>} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
        {withData.map((t) => {
          const v = latest[t.type];
          return (
            <button key={t.type} type="button" onClick={() => setType(t.type)}
              className={clsx('card min-w-[180px] p-4 text-left transition-all', type === t.type ? 'border-ink ring-1 ring-ink' : 'hover:border-ink-4')}>
              <p className="truncate text-[13px] font-medium text-ink-3">{t.label}</p>
              <p className="tnum mt-1.5 font-display text-2xl font-semibold">{show(v.latest, t)} <span className="font-sans text-xs font-normal text-ink-3">{t.unit}</span></p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-3" title={v.previous ? `Previous: ${show(v.previous, t)} ${t.unit}` : undefined}><TrendIcon trend={v.trend} />{relDays(v.latest.at)}</span>
                <StatusBadge status={v.latest.status} />
              </div>
            </button>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-sans text-[15px] font-semibold tracking-normal">{def?.label}</h3>
            <p className="text-xs text-ink-3">Normal range: {def?.normal} <span className="ml-1 inline-block h-2 w-4 rounded-sm bg-ok-soft align-middle" /></p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented size="sm" value={range} onChange={setRange} options={[['30', '30d'], ['90', '90d'], ['365', '1y'], ['all', 'All']]} />
            <Button size="sm" variant="secondary" icon={LuPlus} onClick={() => quick.open('vital', { member: memberId, type })}>Log</Button>
          </div>
        </div>
        {loading ? <Skeleton className="h-[260px]" /> : chart.length > 1 ? (
          <Trend data={chart} band={BANDS[type]} dual={def?.dual} unit={def?.unit} />
        ) : <p className="py-16 text-center text-sm text-ink-3">{chart.length ? 'Add another reading to see a trend.' : 'No readings in this period.'}</p>}
      </Card>

      <Card>
        <DataTable rows={readings} loading={loading} dense
          columns={[
            { key: 'at', header: 'Date', mobile: 'title', render: (r) => <span className="text-[13px] font-medium">{fmtDateTime(r.at)}</span> },
            { key: 'value', header: 'Reading', render: (r) => <span className="tnum font-semibold">{show(r, def)} <span className="text-xs font-normal text-ink-3">{r.unit}</span></span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'source', header: 'Source', mobile: 'hide', render: (r) => (
              <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
                {r.source === 'REPORT_AI' ? <Badge tone="info" className="font-medium">Read from report by AI · you confirmed</Badge>
                  : r.source === 'REPORT_MANUAL' ? <Badge className="font-medium">From report</Badge>
                  : r.source === 'ABDM' ? <Badge tone="ok" className="font-medium">From hospital via ABHA</Badge>
                    : <Badge className="font-medium">Entered by you</Badge>}
                {r.note && <span className="truncate">{r.note}</span>}
              </span>
            ) },
            { key: 'x', header: '', align: 'right', mobile: 'end', render: (r) => <button type="button" onClick={() => remove(r)} className="grid h-8 w-8 place-items-center rounded-full text-ink-4 hover:bg-bad-soft hover:text-bad" aria-label="Delete"><LuTrash2 className="h-4 w-4" /></button> },
          ]} />
      </Card>
    </div>
  );
}

export default function Vitals() {
  const { members, self } = useFamily();
  const [params, setParams] = useSearchParams();
  const memberId = params.get('member') || self?._id || members[0]?._id;
  const quick = useQuickAdd();

  return (
    <div>
      <PageHeader title="Vitals & labs" subtitle="Every reading trains ArogyaPredict — out-of-range values are flagged and trends are forecast ahead."
        actions={<Button icon={LuPlus} onClick={() => quick.open('vital', { member: memberId })}>Log reading</Button>} />
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {members.map((m) => (
          <button key={m._id} type="button" onClick={() => setParams({ member: m._id })}
            className={clsx('flex h-11 shrink-0 items-center gap-2.5 rounded-full border pl-1.5 pr-4 text-sm font-medium transition-colors',
              memberId === m._id ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-4')}>
            <Avatar name={m.name} color={m.color} size="sm" />{m.isSelf ? 'Me' : firstName(m.name)}
          </button>
        ))}
      </div>
      {memberId && <VitalsPanel key={memberId} memberId={memberId} initialType={params.get('type') || ''} />}
    </div>
  );
}
