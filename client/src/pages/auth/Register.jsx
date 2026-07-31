import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiCheckCircle,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Register() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const passwordValue = watch('password', '');

  // Simple password strength calculation
  const hasMinLength = passwordValue.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const strengthScore = [hasMinLength, hasUpper, hasNumber].filter(Boolean).length;

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await registerAuth(data);
      toast.success('Account created successfully!');
      setRegisteredEmail(data.email);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <HiCheckCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Account Created!</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
            We've sent a verification link to <strong className="text-slate-800">{registeredEmail}</strong>.
            Please check your inbox to verify your account.
          </p>
        </div>
        <div className="pt-4">
          <Button
            variant="primary"
            className="w-full shadow-lg shadow-emerald-500/20"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center sm:text-left mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Join ArogyaKosh to manage your health records intelligently.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={HiOutlineUser}
          error={errors.name?.message}
          {...register('name', {
            required: 'Full name is required',
            minLength: {
              value: 3,
              message: 'Name must be at least 3 characters',
            },
          })}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          icon={HiOutlineEnvelope}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email address is required',
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: 'Please enter a valid email address',
            },
          })}
        />

        <div>
          <div className="relative">
            <Input
              label="Password"
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

          {/* Password strength visual indicator */}
          {passwordValue && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1 h-1.5 w-full">
                <div
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    strengthScore >= 1 ? 'bg-rose-500' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    strengthScore === 3 ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 flex justify-between">
                <span>Must include: 8+ chars, 1 uppercase, 1 number</span>
                <span className="font-semibold text-slate-700">
                  {strengthScore === 1 && 'Weak'}
                  {strengthScore === 2 && 'Medium'}
                  {strengthScore === 3 && 'Strong'}
                </span>
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full shadow-lg shadow-emerald-500/20"
          loading={isSubmitting}
        >
          Create Account
        </Button>
      </form>

      <div className="mt-8 text-center border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
