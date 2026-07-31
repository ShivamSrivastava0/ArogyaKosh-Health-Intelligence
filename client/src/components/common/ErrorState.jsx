import React from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import Button from '../ui/Button';

export default function ErrorState({ title = "Something went wrong", description = "We couldn't load the data. Please try again.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-100">
      <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
        <HiOutlineExclamationTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Try Again
        </Button>
      )}
    </div>
  );
}
