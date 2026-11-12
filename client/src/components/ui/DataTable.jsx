import clsx from 'clsx';
import { Skeleton } from './Display';

/**
 * Responsive table: a real <table> on desktop, stacked cards on phones.
 * columns: [{ key, header, render(row), className, align, mobile: 'title'|'meta'|'hide', width }]
 */
export default function DataTable({ columns, rows, rowKey = '_id', onRowClick, loading, empty, dense, className, rowClassName }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }
  if (!rows?.length) return empty || null;

  const titleCol = columns.find((c) => c.mobile === 'title') || columns[0];
  const metaCols = columns.filter((c) => c !== titleCol && c.mobile !== 'hide');

  return (
    <div className={className}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }}
                  className={clsx('sticky top-0 z-[1] border-b border-line bg-surface px-4 py-3 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3 first:pl-5 last:pr-5',
                    c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx('group transition-colors', onRowClick && 'cursor-pointer hover:bg-paper/70', rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key}
                    className={clsx('border-b border-line-soft px-4 align-middle first:pl-5 last:pr-5 group-last:border-0', dense ? 'py-2.5' : 'py-3.5',
                      c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line-soft md:hidden">
        {rows.map((row) => (
          <li key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={clsx('px-4 py-3.5', onRowClick && 'active:bg-paper', rowClassName?.(row))}>
            <div className="text-sm">{titleCol.render ? titleCol.render(row) : row[titleCol.key]}</div>
            {metaCols.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-3">
                {metaCols.map((c) => (
                  <div key={c.key} className={clsx('flex items-center gap-1.5', c.mobile === 'end' && 'ml-auto')} onClick={c.stop ? (e) => e.stopPropagation() : undefined}>
                    {c.mobile !== 'end' && c.header && <span className="text-2xs uppercase tracking-wider text-ink-4">{c.header}</span>}
                    {c.render ? c.render(row) : row[c.key]}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
