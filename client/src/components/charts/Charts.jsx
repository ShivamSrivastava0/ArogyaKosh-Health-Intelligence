import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceArea, Cell,
} from 'recharts';

const AXIS = { fontSize: 11, fill: '#6B6B65' };

function TipBox({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="tnum font-semibold">{format ? format(p.value, p) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Simple bar chart. data: [{ label, value, color? }] */
export function Bars({ data, height = 220, format, valueName = 'Value', color = '#121212', highlightLast }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F0EEE8" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={format} />
        <Tooltip cursor={{ fill: 'rgba(18,18,18,0.04)' }} content={<TipBox format={format} />} />
        <Bar dataKey="value" name={valueName} radius={[6, 6, 6, 6]} maxBarSize={36}>
          {data.map((d, i) => <Cell key={d.label} fill={d.color || (highlightLast && i === data.length - 1 ? '#D4F25A' : color)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Trend line with a shaded "normal" band.
 * data: [{ label, value, value2? }]; band: [min, max]
 */
export function Trend({ data, height = 260, band, dual, unit }) {
  const fmt = (v) => `${v}${unit ? ` ${unit}` : ''}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F0EEE8" />
        {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="#E2F4E8" fillOpacity={0.7} ifOverflow="extendDomain" />}
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
        <Tooltip content={<TipBox format={(v) => fmt(v)} />} />
        <Line type="monotone" dataKey="value" name={dual ? 'Systolic' : 'Reading'} stroke="#121212" strokeWidth={2.25} dot={{ r: 3, fill: '#121212' }} activeDot={{ r: 5, fill: '#D4F25A', stroke: '#121212' }} />
        {dual && <Line type="monotone" dataKey="value2" name="Diastolic" stroke="#8B8B84" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2.5, fill: '#8B8B84' }} />}
      </LineChart>
    </ResponsiveContainer>
  );
}
