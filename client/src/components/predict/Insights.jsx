import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { LuCircleAlert, LuTriangleAlert, LuTrendingUp, LuInfo, LuChevronRight } from 'react-icons/lu';
import { MemberChip, Badge } from '../ui/Display';

export const LEVEL = {
  critical: { icon: LuCircleAlert, cls: 'bg-bad-soft text-bad', label: 'Act soon' },
  warning: { icon: LuTriangleAlert, cls: 'bg-warn-soft text-warn', label: 'Watch' },
  good: { icon: LuTrendingUp, cls: 'bg-ok-soft text-ok', label: 'Improving' },
  info: { icon: LuInfo, cls: 'bg-info-soft text-info', label: 'Note' },
};

const KIND = { RISK: 'Risk model', FORECAST: 'Forecast', ANOMALY: 'Unusual reading', PATTERN: 'Learned pattern' };

/** Ranked prediction insights. withMember shows who each one is about. */
export default function InsightList({ insights, withMember, linkTo, compact }) {
  if (!insights?.length) return null;
  return (
    <ul className="space-y-1">
      {insights.map((i) => {
        const L = LEVEL[i.level] || LEVEL.info;
        const to = linkTo?.(i);
        const body = (
          <>
            <span className={clsx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', L.cls)}><L.icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{i.title}{!compact && <Badge className="font-medium">{KIND[i.kind] || i.kind}</Badge>}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{i.detail}</p>
            </div>
            {withMember && i.member && <MemberChip member={i.member} className="mt-1 hidden sm:inline-flex" />}
            {to && <LuChevronRight className="mt-2 h-4 w-4 text-ink-4 group-hover:text-ink" />}
          </>
        );
        const cls = 'group flex items-start gap-3 rounded-2xl px-3 py-3';
        return <li key={i.id}>{to ? <Link to={to} className={clsx(cls, 'hover:bg-paper')}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
      })}
    </ul>
  );
}
