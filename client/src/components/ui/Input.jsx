import React, { forwardRef, useState } from 'react';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { classNames } from '../../utils';

const Input = forwardRef(({
  label,
  error,
  helperText,
  type = 'text',
  leftIcon,
  rightIcon,
  className = '',
  disabled = false,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const baseInputStyles = "block w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-colors disabled:bg-slate-50 disabled:dark:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed";
  const errorStyles = error ? "border-rose-300 dark:border-rose-500 text-rose-900 dark:text-rose-400 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500" : "";
  const iconPadding = leftIcon ? "pl-10" : "";
  const rightIconPadding = (rightIcon || isPassword) ? "pr-10" : "";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative rounded-md shadow-sm">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        
        {type === 'textarea' ? (
          <textarea
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={classNames(baseInputStyles, errorStyles, className)}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            type={inputType}
            id={inputId}
            disabled={disabled}
            className={classNames(baseInputStyles, errorStyles, iconPadding, rightIconPadding, className)}
            {...props}
          />
        )}

        {(rightIcon || isPassword) && type !== 'textarea' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-500 focus:outline-none focus:text-emerald-500"
              >
                {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
              </button>
            ) : (
              <div className="text-slate-400">{rightIcon}</div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-sm text-slate-500">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
