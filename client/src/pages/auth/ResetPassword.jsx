import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiCheckCircle } from 'react-icons/hi2';
import { resetPassword } from '../../services/authService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const passwordValue = watch('password', '');

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await resetPassword(token, {
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      toast.success('Password reset successfully!');
      setIsResetComplete(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResetComplete) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <HiCheckCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Password Reset Complete</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
            Your password has been updated. You can now log in with your new password.
          </p>
        </div>
        <div className="pt-4">
          <Button
            variant="primary"
            className="w-full shadow-lg shadow-emerald-500/20"
            onClick={() => navigate('/login')}
          >
            Sign In Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center sm:text-left mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={HiOutlineLockClosed}
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
              validate: {
                hasUpper: (v) => /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                hasNum: (v) => /[0-9]/.test(v) || 'Must contain at least one number',
              },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? (
              <HiOutlineEyeSlash className="w-5 h-5" />
            ) : (
              <HiOutlineEye className="w-5 h-5" />
            )}
          </button>
        </div>

        <Input
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={HiOutlineLockClosed}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === passwordValue || 'Passwords do not match',
          })}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full shadow-lg shadow-emerald-500/20"
          loading={isSubmitting}
        >
          Reset Password
        </Button>
      </form>

      <div className="mt-8 text-center border-t border-slate-200 pt-6">
        <Link
          to="/login"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
