import React from 'react';
import { classNames } from '../../utils';

export const Spinner = ({ size = 'md', color = 'emerald', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colors = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    white: 'text-white',
    slate: 'text-slate-500'
  };

  return (
    <svg 
      className={classNames("animate-spin", sizes[size], colors[color], className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

export const SkeletonLine = ({ className = '' }) => (
  <div className={classNames("animate-pulse bg-slate-200 rounded", className)}></div>
);

export const SkeletonCircle = ({ className = '' }) => (
  <div className={classNames("animate-pulse bg-slate-200 rounded-full", className)}></div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={classNames("bg-white p-4 rounded-xl border border-slate-200 shadow-sm", className)}>
    <div className="flex items-center space-x-4 mb-4">
      <SkeletonCircle className="w-12 h-12" />
      <div className="flex-1 py-1 space-y-2">
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-5/6" />
      <SkeletonLine className="h-3 w-4/6" />
    </div>
  </div>
);

export default function Loader({ size = 'md', text = '', color = 'emerald', className = '' }) {
  return (
    <div className={classNames("flex flex-col items-center justify-center p-4", className)}>
      <Spinner size={size} color={color} />
      {text && <p className="mt-3 text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );
}
