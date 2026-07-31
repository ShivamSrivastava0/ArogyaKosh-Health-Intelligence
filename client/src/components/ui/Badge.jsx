import React from 'react';
import { classNames } from '../../utils';

export default function Badge({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) {
  const baseStyles = "inline-flex items-center font-medium rounded-full";
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const variants = {
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    danger: "bg-rose-100 text-rose-800 border border-rose-200",
    info: "bg-blue-100 text-blue-800 border border-blue-200",
    neutral: "bg-slate-100 text-slate-800 border border-slate-200",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    neutral: "bg-slate-500",
  };

  return (
    <span className={classNames(baseStyles, sizes[size], variants[variant], className)}>
      {dot && (
        <span className={classNames("mr-1.5 h-1.5 w-1.5 rounded-full", dotColors[variant])} aria-hidden="true"></span>
      )}
      {children}
    </span>
  );
}
