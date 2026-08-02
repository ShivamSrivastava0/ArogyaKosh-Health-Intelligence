import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '../../utils';

export default function Card({ 
  title, 
  description, 
  icon, 
  action, 
  children, 
  className = '', 
  hoverable = false,
  bordered = true,
  variant = 'default',
  onClick
}) {
  const baseStyles = "bg-white dark:bg-slate-900 rounded-xl overflow-hidden transition-all duration-300";
  const variants = {
    default: bordered ? "border border-slate-200 dark:border-slate-800 shadow-sm" : "shadow-sm",
    outlined: "border border-slate-200 dark:border-slate-800",
    elevated: "shadow-md border border-slate-100 dark:border-slate-800"
  };
  const hoverStyles = hoverable ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer" : "";

  const CardWrapper = hoverable ? motion.div : 'div';

  return (
    <CardWrapper 
      className={classNames(baseStyles, variants[variant], hoverStyles, className)}
      onClick={onClick}
    >
      {(title || icon || action) && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{title}</h3>}
              {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </CardWrapper>
  );
}
