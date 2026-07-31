import React from 'react';
import { classNames } from '../../utils';

export default function SectionHeader({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={classNames("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
      <div className="flex items-start sm:items-center gap-3">
        {Icon && (
          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-emerald-600 shrink-0 mt-1 sm:mt-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
