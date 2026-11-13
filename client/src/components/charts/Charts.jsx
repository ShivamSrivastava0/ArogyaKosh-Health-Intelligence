import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceArea, ReferenceLine, Cell, ComposedChart, Area,
} from 'recharts';

const AXIS = { fontSize: 11, fill: '#5F7385' };

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
export function Bars({ data, height = 220, format, valueName = 'Value', color = '#0B2239', highlightLast }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EDF2F5" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={format} />
        <Tooltip cursor={{ fill: 'rgba(18,18,18,0.04)' }} content={<TipBox format={format} />} />
        <Bar dataKey="value" name={valueName} radius={[6, 6, 6, 6]} maxBarSize={36}>
          {data.map((d, i) => <Cell key={d.label} fill={d.color || (highlightLast && i === data.length - 1 ? '#2DD4BF' : color)} />)}
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
        <CartesianGrid vertical={false} stroke="#EDF2F5" />
        {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="#DCF5EC" fillOpacity={0.7} ifOverflow="extendDomain" />}
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
        <Tooltip content={<TipBox format={(v) => fmt(v)} />} />
        <Line type="monotone" dataKey="value" name={dual ? 'Systolic' : 'Reading'} stroke="#0B2239" strokeWidth={2.25} dot={{ r: 3, fill: '#0B2239' }} activeDot={{ r: 5, fill: '#2DD4BF', stroke: '#0B2239' }} />
        {dual && <Line type="monotone" dataKey="value2" name="Diastolic" stroke="#7C93A6" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2.5, fill: '#7C93A6' }} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * History (solid) + projection (dashed) with an uncertainty band.
 * history: [{ t, y, y2 }], forecast: [{ t, y, lo, hi, y2 }], band: [min, max]
 */
export function ForecastChart({ history = [], forecast = [], band, unit, dual, height = 220 }) {
  const rows = [
    ...history.map((h) => ({ x: new Date(h.t).getTime(), actual: h.y, actual2: dual ? h.y2 : undefined })),
    ...forecast.map((f) => ({ x: new Date(f.t).getTime(), projected: f.y, range: [f.lo, f.hi], projected2: dual ? f.y2 : undefined })),
  ].sort((a, b) => a.x - b.x);
  const fmtX = (x) => new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const now = Date.now();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EDF2F5" />
        {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="#DCF5EC" fillOpacity={0.7} ifOverflow="extendDomain" />}
        <ReferenceLine x={now} stroke="#9AABB9" strokeDasharray="3 3" label={{ value: 'Today', position: 'insideTopRight', fontSize: 10, fill: '#5F7385' }} />
        <XAxis dataKey="x" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtX} tick={AXIS} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
        <Tooltip labelFormatter={fmtX} content={<TipBox format={(v) => (Array.isArray(v) ? `${v[0]}–${v[1]} ${unit || ''}` : `${v} ${unit || ''}`)} />} />
        <Area dataKey="range" name="Likely range" stroke="none" fill="#2DD4BF" fillOpacity={0.18} connectNulls isAnimationActive={false} />
        <Line dataKey="actual" name={dual ? 'Systolic' : 'Reading'} stroke="#0B2239" strokeWidth={2.25} dot={{ r: 2.5, fill: '#0B2239' }} connectNulls isAnimationActive={false} />
        {dual && <Line dataKey="actual2" name="Diastolic" stroke="#7C93A6" strokeWidth={1.75} dot={{ r: 2, fill: '#7C93A6' }} connectNulls isAnimationActive={false} />}
        <Line dataKey="projected" name="Forecast" stroke="#0D9488" strokeWidth={2.5} strokeDasharray="6 5" dot={false} connectNulls isAnimationActive={false} />
        {dual && <Line dataKey="projected2" name="Forecast (diastolic)" stroke="#5EC4B6" strokeWidth={1.75} strokeDasharray="6 5" dot={false} connectNulls isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
